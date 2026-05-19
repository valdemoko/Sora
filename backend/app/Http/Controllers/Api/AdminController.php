<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ForumPost;
use App\Models\ForumReply;
use App\Models\Photo;
use App\Models\PhotoComment;
use App\Models\User;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    // Obtención de métricas globales de la plataforma
    public function stats(Request $request)
    {
        // Contabilización del total de usuarios, publicaciones y fotos persistidas
        return response()->json([
            'counts' => [
                'users' => User::count(),
                'forum_posts' => ForumPost::count(),
                'photos' => Photo::count(),
            ],
        ]);
    }

    // Obtención de la lista paginada de usuarios (30 registros por página)
    public function users(Request $request)
    {
        // Recuperación ordenada por identificador único de usuario
        $users = User::orderBy('id')->paginate(30);

        return response()->json([
            'users' => collect($users->items())->map(fn (User $u) => \App\Support\UserPresenter::public($u, $request->user())),
            'current_page' => $users->currentPage(),
            'last_page' => $users->lastPage(),
        ]);
    }

    // Eliminación física de un usuario
    public function deleteUser(Request $request, User $user)
    {
        // Restricción para evitar la autoeliminación de la cuenta de administrador
        abort_if($request->user()->id === $user->id, 422, 'No puedes borrarte a ti mismo');

        $user->delete();

        return response()->json(['ok' => true]);
    }

    // Alternancia del rol de administrador para un usuario
    public function toggleAdmin(Request $request, User $user)
    {
        // Restricción para evitar la autorevocación del rol de administrador
        abort_if($request->user()->id === $user->id, 422, 'No puedes cambiar tu propio estado de admin');
        $user->is_admin = ! $user->is_admin;
        $user->save();
        return response()->json(['is_admin' => (bool) $user->is_admin]);
    }

    // Eliminación física de una publicación del foro
    public function deleteForumPost(ForumPost $forumPost)
    {
        // Eliminación directa de la publicación
        $forumPost->delete();
        return response()->json(['ok' => true]);
    }

    // Eliminación física de una respuesta del foro
    public function deleteForumReply(ForumReply $forumReply)
    {
        // Eliminación directa de la respuesta
        $forumReply->delete();
        return response()->json(['ok' => true]);
    }

    // Eliminación física de una foto de la galería
    public function deletePhoto(Photo $photo)
    {
        // Eliminación directa del registro fotográfico
        $photo->delete();
        return response()->json(['ok' => true]);
    }

    // Eliminación física de un comentario en una foto
    public function deletePhotoComment(PhotoComment $photoComment)
    {
        // Eliminación directa del comentario fotográfico
        $photoComment->delete();
        return response()->json(['ok' => true]);
    }

    // Obtención de contenidos recientes para moderación y revisión
    public function recentContent(Request $request)
    {
        // Recuperación de los últimos 25 elementos creados (publicaciones y fotos)
        $posts = ForumPost::with(['user', 'replies.user'])->latest()->limit(25)->get();
        $photos = Photo::with(['user', 'comments.user'])->latest()->limit(25)->get();

        return response()->json([
            'forum_posts' => $posts->map(fn (ForumPost $p) => [
                'id' => $p->id,
                'body' => $p->body,
                'user' => $p->user ? \App\Support\UserPresenter::public($p->user) : null,
                'created_at' => $p->created_at?->toIso8601String(),
                'replies' => $p->replies->map(fn (ForumReply $r) => [
                    'id' => $r->id,
                    'body' => $r->body,
                    'user' => $r->user ? \App\Support\UserPresenter::public($r->user) : null,
                ]),
            ]),
            'photos' => $photos->map(fn (Photo $ph) => [
                'id' => $ph->id,
                'image_url' => $ph->image_path ? asset('storage/'.$ph->image_path) : null,
                'caption' => $ph->caption,
                'user' => $ph->user ? \App\Support\UserPresenter::public($ph->user) : null,
                'created_at' => $ph->created_at?->toIso8601String(),
                'comments' => $ph->comments->map(fn (PhotoComment $c) => [
                    'id' => $c->id,
                    'body' => $c->body,
                    'user' => $c->user ? \App\Support\UserPresenter::public($c->user) : null,
                ]),
            ]),
        ]);
    }
}
