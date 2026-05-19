<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ForumPost;
use App\Models\Like;
use App\Models\PollOption;
use App\Models\PollVote;
use App\Models\ForumReply;
use App\Services\Notifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ForumPostController extends Controller
{
    // Obtención paginada de publicaciones del foro (15 elementos por página)
    public function index(Request $request)
    {
        $auth = $request->user();
        
        // Filtrado por políticas de visibilidad (perfiles públicos, propios o seguidos autorizados)
        $posts = ForumPost::whereHas('user', function($q) use ($auth) {
                $q->where(function ($qu) use ($auth) {
                    $qu->where('is_private', false)
                       ->orWhere('id', $auth->id)
                       ->orWhereHas('followers', function($qf) use ($auth) {
                           $qf->where('follower_id', $auth->id)->where('accepted', true);
                       });
                });
            })
            ->with([
                'user',
                'pollOptions' => fn ($q) => $q->orderBy('position')->withCount('votes'),
                'replies' => fn ($q) => $q->with('user')->withCount('likes')->orderBy('created_at'),
            ])
            ->withCount(['likes', 'replies as all_replies_count'])
            ->withExists(['likes as liked_by_me' => fn($q) => $q->where('user_id', $auth->id)])
            ->withExists(['pollVotes as has_voted' => fn($q) => $q->where('user_id', $auth->id)])
            ->orderByDesc('created_at')
            ->paginate(15);
 
        return response()->json($this->paginatePosts($posts, $auth));
    }

    // Registro de una nueva publicación (con soporte opcional para imagen y encuesta)
    public function store(Request $request)
    {
        $data = $request->validate([
            'body' => ['required', 'string', 'max:8000'],
            'image' => ['nullable', 'image', 'max:10240'],
            'poll_options' => ['nullable', 'array'],
            'poll_options.*' => ['required_with:poll_options', 'string', 'max:200'],
        ]);
 
        $pollOptions = $data['poll_options'] ?? [];
 
        // Ejecución en transacción para asegurar consistencia e integridad referencial
        $post = DB::transaction(function () use ($request, $data, $pollOptions) {
            $hasPoll = count($pollOptions) >= 2;
 
            $imagePath = null;
            if ($request->hasFile('image')) {
                $imagePath = $request->file('image')->store('forum', 'public');
            }
 
            $post = ForumPost::create([
                'user_id' => $request->user()->id,
                'body' => $data['body'],
                'image_path' => $imagePath,
                'has_poll' => $hasPoll,
            ]);
 
            // Inserción de opciones asociadas a la encuesta si aplica
            if ($hasPoll) {
                foreach ($pollOptions as $i => $label) {
                    PollOption::create([
                        'forum_post_id' => $post->id,
                        'label' => $label,
                        'position' => $i,
                    ]);
                }
            }
 
            return $post;
        });

        $post->load(['user', 'pollOptions' => fn ($q) => $q->orderBy('position')->withCount('votes')]);

        return response()->json([
            'post' => $this->presentForumPost($post, $request->user()),
        ], 201);
    }

    // Actualización del cuerpo de una publicación
    public function update(Request $request, ForumPost $forumPost)
    {
        abort_unless($request->user()->id === $forumPost->user_id, 403);
  
        $data = $request->validate(['body' => ['required', 'string', 'max:8000']]);
        $forumPost->update($data);
  
        return response()->json(['post' => $this->presentForumPost($forumPost, $request->user())]);
    }
  
    // Eliminación física de una publicación propia y su imagen adjunta
    public function destroy(Request $request, ForumPost $forumPost)
    {
        abort_unless($request->user()->id === $forumPost->user_id, 403);
        if ($forumPost->image_path) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($forumPost->image_path);
        }
        $forumPost->delete();
        return response()->json(['ok' => true]);
    }

    // Obtención detallada de una publicación y su hilo de respuestas completo
    public function show(Request $request, ForumPost $forumPost)
    {
        $auth = $request->user();
        $forumPost->load(['user', 'pollOptions' => fn ($q) => $q->orderBy('position')->withCount('votes')]);

        return response()->json([
            'post' => $this->presentForumPost($forumPost, $auth),
            'replies' => $this->flattenReplies($forumPost, $auth),
        ]);
    }

    // Modificación de la reacción de "Me gusta" a una publicación (Toggle)
    public function toggleLike(Request $request, ForumPost $forumPost)
    {
        $auth = $request->user();

        return DB::transaction(function () use ($auth, $forumPost) {
            $existing = Like::where('user_id', $auth->id)
                ->where('likeable_type', ForumPost::class)
                ->where('likeable_id', $forumPost->id)
                ->first();

            if ($existing) {
                $existing->delete();
                return response()->json(['liked' => false, 'likes_count' => $forumPost->likes()->count()]);
            }

            Like::create([
                'user_id' => $auth->id,
                'likeable_type' => ForumPost::class,
                'likeable_id' => $forumPost->id,
            ]);

            // Disparo de notificación al autor de la publicación
            Notifier::push($forumPost->user_id, $auth->id, 'like_post', ['forum_post_id' => $forumPost->id]);

            return response()->json(['liked' => true, 'likes_count' => $forumPost->likes()->count()]);
        });
    }

    // Registro o modificación de un voto en la encuesta asociada
    public function vote(Request $request, ForumPost $forumPost)
    {
        if (! $forumPost->has_poll) return response()->json(['message' => 'no hay encuesta'], 422);

        $data = $request->validate(['poll_option_id' => ['required', 'integer']]);
        $optionId = $data['poll_option_id'];

        if (! PollOption::where('forum_post_id', $forumPost->id)->whereKey($optionId)->exists()) {
            return response()->json(['message' => 'opción no válida'], 422);
        }

        $auth = $request->user();

        // Control transaccional concurrente del voto (restricción de una única selección por usuario)
        DB::transaction(function () use ($auth, $forumPost, $optionId) {
            $existingVote = PollVote::where('user_id', $auth->id)
                ->whereIn('poll_option_id', $forumPost->pollOptions()->pluck('id'))
                ->lockForUpdate()
                ->first();

            if ($existingVote) {
                $existingVote->update(['poll_option_id' => $optionId]);
            } else {
                PollVote::create([
                    'user_id' => $auth->id,
                    'poll_option_id' => $optionId,
                ]);
            }
        });

        $forumPost->load(['pollOptions' => fn ($q) => $q->orderBy('position')->withCount('votes')]);

        return response()->json(['post' => $this->presentForumPost($forumPost->fresh(), $auth)]);
    }

    // Formateador y transformador paginado para respuestas del foro
    protected function paginatePosts($paginator, $viewer): array
    {
        return [
            'data' => collect($paginator->items())->map(function (ForumPost $p) use ($viewer) {
                $payload = $this->presentForumPost($p, $viewer);
                $payload['replies'] = $p->allReplies
                    ->map(fn (ForumReply $r) => $this->presentForumReplyFlat($r, $viewer))
                    ->values()->all();
                return $payload;
            })->values()->all(),
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
        ];
    }

    // Aplanamiento estructural del árbol de respuestas ordenadas cronológicamente
    protected function flattenReplies(ForumPost $post, $viewer): array
    {
        return $post->allReplies()
            ->with('user')
            ->withCount(['likes'])
            ->withExists(['likes as liked_by_me' => fn($q) => $q->where('user_id', $viewer->id)])
            ->orderBy('created_at')
            ->get()
            ->map(fn (ForumReply $r) => $this->presentForumReplyFlat($r, $viewer))
            ->values()->all();
    }

    // Formateador DTO de la publicación del foro para salida JSON
    protected function presentForumPost(ForumPost $p, $viewer): array
    {
        $pollStats = [];
        foreach ($p->pollOptions ?? [] as $opt) {
            $voteCount = $opt->votes_count ?? $opt->votes()->count();
            $pollStats[] = ['id' => $opt->id, 'label' => $opt->label, 'votes' => $voteCount];
        }

        $totalVotes = array_sum(array_column($pollStats, 'votes'));
        foreach ($pollStats as &$row) {
            $row['percent'] = $totalVotes > 0 ? round(100 * ($row['votes'] / $totalVotes), 1) : 0.0;
        }

        $myVoteId = null;
        if ($viewer) {
            $myVoteId = PollVote::where('user_id', $viewer->id)
                ->whereIn('poll_option_id', $p->pollOptions->pluck('id'))
                ->value('poll_option_id');
        }

        return [
            'id' => $p->id,
            'body' => $p->body,
            'image_url' => $p->image_path ? asset('storage/'.$p->image_path) : null,
            'has_poll' => (bool) $p->has_poll,
            'poll_options' => $pollStats,
            'my_poll_option_id' => $myVoteId,
            'likes_count' => $p->likes_count ?? $p->likes()->count(),
            'liked_by_me' => (bool) ($p->liked_by_me ?? $p->likes()->where('user_id', $viewer->id)->exists()),
            'replies_count' => $p->all_replies_count ?? $p->allReplies()->count(),
            'user' => $p->user ? \App\Support\UserPresenter::public($p->user, $viewer) : null,
            'created_at' => $p->created_at?->toIso8601String(),
        ];
    }

    // Formateador DTO de respuesta plana del foro para salida JSON
    protected function presentForumReplyFlat(ForumReply $r, $viewer): array
    {
        return [
            'id' => $r->id,
            'forum_post_id' => $r->forum_post_id,
            'parent_id' => $r->parent_id,
            'body' => $r->body,
            'likes_count' => $r->likes_count ?? $r->likes()->count(),
            'liked_by_me' => (bool) ($r->liked_by_me ?? $r->likes()->where('user_id', $viewer->id)->exists()),
            'user' => $r->user ? \App\Support\UserPresenter::public($r->user, $viewer) : null,
            'created_at' => $r->created_at?->toIso8601String(),
        ];
    }
}
