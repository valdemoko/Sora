<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Like;
use App\Models\Photo;
use App\Models\PhotoComment;
use App\Services\Notifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PhotoController extends Controller
{
    // Obtención de fotos para el carrusel principal
    public function carousel(Request $request)
    {
        $auth = $request->user();
        
        // Filtrado por visibilidad (perfiles públicos, propios o seguidos autorizados)
        $photos = Photo::whereHas('user', function($q) use ($auth) {
            $q->where(function ($qu) use ($auth) {
                $qu->where('is_private', false)
                   ->orWhere('id', $auth->id)
                   ->orWhereHas('followers', function($qf) use ($auth) {
                       $qf->where('follower_id', $auth->id)->where('accepted', true);
                   });
            });
        })
            ->with(['user', 'comments.user']) 
            ->withCount(['likes', 'comments'])
            ->withExists(['likes as liked_by_me' => fn($q) => $q->where('user_id', $auth->id)])
            ->inRandomOrder()
            ->limit(30)
            ->get();

        return response()->json([
            'photos' => $photos->map(fn (Photo $p) => $this->presentPhoto($p, $auth)),
        ]);
    }

    // Registro de una nueva foto en la galería
    public function store(Request $request)
    {
        $data = $request->validate([
            'caption' => ['nullable', 'string', 'max:500'],
            'image' => ['required', 'image', 'max:10240'],
        ]);

        // Almacenamiento físico de la imagen en el disco público
        $path = $request->file('image')->store('photos', 'public');

        $photo = Photo::create([
            'user_id' => $request->user()->id,
            'image_path' => $path,
            'caption' => $data['caption'] ?? null,
        ]);

        $photo->load('user');

        return response()->json([
            'photo' => $this->presentPhoto($photo, $request->user()),
        ], 201);
    }

    // Actualización del texto del pie de una foto
    public function update(Request $request, Photo $photo)
    {
        abort_unless($request->user()->id === $photo->user_id, 403);
 
        $data = $request->validate(['caption' => ['nullable', 'string', 'max:500']]);
        $photo->update($data);
 
        return response()->json(['photo' => $this->presentPhoto($photo, $request->user())]);
    }
 
    // Eliminación de una foto y su archivo asociado
    public function destroy(Request $request, Photo $photo)
    {
        abort_unless($request->user()->id === $photo->user_id, 403);
        if ($photo->image_path) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($photo->image_path);
        }
        $photo->delete();
        return response()->json(['ok' => true]);
    }

    // Obtención de comentarios asociados a una foto
    public function comments(Request $request, Photo $photo)
    {
        $comments = $photo->comments()->with('user')->orderBy('created_at')->get();
        return response()->json([
            'comments' => $comments->map(fn (PhotoComment $c) => $this->presentComment($c)),
        ]);
    }

    // Adición de un comentario a la foto
    public function addComment(Request $request, Photo $photo)
    {
        $data = $request->validate(['body' => ['required', 'string', 'max:2000']]);
        $auth = $request->user();

        $comment = PhotoComment::create([
            'photo_id' => $photo->id,
            'user_id' => $auth->id,
            'body' => $data['body'],
        ]);

        // Disparo de notificación al propietario de la foto
        Notifier::push($photo->user_id, $auth->id, 'comment_photo', ['photo_id' => $photo->id]);

        $comment->load('user');

        return response()->json(['comment' => $this->presentComment($comment)], 201);
    }

    // Modificación de la reacción de "Me gusta" (Toggle)
    public function toggleLike(Request $request, Photo $photo)
    {
        $auth = $request->user();

        return DB::transaction(function () use ($auth, $photo) {
            $existing = Like::where('user_id', $auth->id)
                ->where('likeable_type', Photo::class)
                ->where('likeable_id', $photo->id)
                ->first();

            if ($existing) {
                $existing->delete();
                return response()->json(['liked' => false, 'likes_count' => $photo->likes()->count()]);
            }

            Like::create([
                'user_id' => $auth->id,
                'likeable_type' => Photo::class,
                'likeable_id' => $photo->id,
            ]);

            // Disparo de notificación de "Me gusta" al propietario
            Notifier::push($photo->user_id, $auth->id, 'like_photo', ['photo_id' => $photo->id]);

            return response()->json(['liked' => true, 'likes_count' => $photo->likes()->count()]);
        });
    }

    // Formateador DTO de la foto para salida JSON
    protected function presentPhoto(Photo $p, $viewer): array
    {
        $comments = $p->relationLoaded('comments') ? $p->comments : $p->comments()->with('user')->orderBy('created_at')->get();
        return [
            'id' => $p->id,
            'caption' => $p->caption,
            'image_url' => $p->image_path ? asset('storage/'.$p->image_path) : null,
            'likes_count' => $p->likes_count ?? $p->likes()->count(),
            'comments_count' => $p->comments_count ?? $p->comments()->count(),
            'liked_by_me' => (bool) ($p->liked_by_me ?? $p->likes()->where('user_id', $viewer->id)->exists()),
            'user_id' => $p->user_id,
            'user' => $p->user ? \App\Support\UserPresenter::public($p->user, $viewer) : null,
            'comments' => collect($comments)->map(fn (PhotoComment $c) => $this->presentComment($c))->values()->all(),
            'created_at' => $p->created_at?->toIso8601String(),
        ];
    }

    // Formateador DTO de comentario para salida JSON
    protected function presentComment(PhotoComment $c): array
    {
        return [
            'id' => $c->id,
            'body' => $c->body,
            'created_at' => $c->created_at?->toIso8601String(),
            'user' => $c->user ? \App\Support\UserPresenter::public($c->user) : null,
        ];
    }
}
