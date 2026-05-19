<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ForumPost;
use App\Models\Group;
use App\Models\User;
use App\Models\Photo;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    // Busca usuarios, grupos, posts y fotos que coincidan con el texto que escribe el usuario
    public function search(Request $request)
    {
        $qRaw = trim((string) $request->get('q', ''));
        
        // Si el texto a buscar es muy corto (menos de 2 letras), no busca nada para no perder rendimiento
        if (strlen($qRaw) < 2) {
            return response()->json([
                'users' => [],
                'groups' => [],
                'posts' => [],
                'photos' => [],
            ]);
        }

        // Prepara el texto para la consulta SQL con comodines de porcentaje (%)
        $q = '%'.str_replace(['%', '_'], ['\\%', '\\_'], $qRaw).'%';

        // Busca usuarios que no sean administradores por su nombre de usuario o nombre completo
        $users = User::whereNotNull('username')
            ->where('is_admin', false)
            ->where('username', '!=', 'admin')
            ->where(function ($qb) use ($q) {
                $qb->where('username', 'like', $q)
                    ->orWhere('name', 'like', $q);
            })
            ->limit(20)
            ->get();

        // Busca grupos o comunidades por su nombre
        $groups = Group::where('name', 'like', $q)->limit(20)->get();

        // Busca publicaciones en el foro que contengan el texto escrito
        $posts = ForumPost::with('user')
            ->where('body', 'like', $q)
            ->latest()
            ->limit(20)
            ->get();

        // Busca fotos en la galería según el texto de su descripción
        $photos = Photo::with('user')
            ->where('caption', 'like', $q)
            ->latest()
            ->limit(20)
            ->get();

        return response()->json([
            'users' => $users->map(fn (User $u) => \App\Support\UserPresenter::public($u)),
            'groups' => $groups->map(fn (Group $g) => ['id' => $g->id, 'name' => $g->name]),
            'posts' => $posts->map(fn (ForumPost $p) => [
                'id' => $p->id,
                'body' => mb_substr($p->body, 0, 280),
                'user' => $p->user ? \App\Support\UserPresenter::public($p->user) : null,
            ]),
            'photos' => $photos->map(fn (Photo $ph) => [
                'id' => $ph->id,
                'caption' => $ph->caption,
                'image_url' => $ph->image_path ? asset('storage/'.$ph->image_path) : null,
                'user' => $ph->user ? \App\Support\UserPresenter::public($ph->user) : null,
            ]),
        ]);
    }
}
