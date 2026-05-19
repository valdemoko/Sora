<?php
 
namespace App\Http\Controllers\Api;
 
use App\Http\Controllers\Controller;
use App\Models\ForumPost;
use App\Models\ForumReply;
use App\Models\Photo;
use App\Models\User;
use App\Support\UserPresenter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ProfileController extends Controller
{
    // Carga de la información de perfil para el estudio de creación
    public function studio(Request $request, User $user)
    {
        // Denegar acceso si se intenta consultar la cuenta administradora
        abort_if(!$request->user()->is_admin && ($user->is_admin || $user->username === 'admin'), 404);

        $auth = $request->user();
        
        // Verificación de autorización de visualización (propio usuario, administrador, perfil público o seguidor)
        $isAuthorized = $auth->id === $user->id || 
                        $auth->is_admin ||
                        !$user->is_private || 
                        $auth->followingUsers()->whereKey($user->id)->wherePivot('accepted', true)->exists();

        $photos = [];
        $groups = [];

        // Recuperación de la colección de fotos y comunidades asociadas si se cuenta con autorización
        if ($isAuthorized) {
            $photos = Photo::where('user_id', $user->id)
                ->withCount(['likes', 'comments'])
                ->orderByDesc('id')
                ->limit(48)
                ->get()
                ->map(fn (Photo $ph) => [
                    'id' => $ph->id,
                    'image_url' => $ph->image_path ? asset('storage/'.$ph->image_path) : null,
                    'caption' => $ph->caption,
                    'likes_count' => $ph->likes_count,
                    'comments_count' => $ph->comments_count,
                    'created_at' => $ph->created_at?->toIso8601String(),
                ]);

            $groups = $user->groups()->with('owner')->withCount('members')->get()->map(fn ($g) => [
                'id' => $g->id,
                'name' => $g->name,
                'description' => $g->description,
                'image_url' => $g->image_path ? asset('storage/'.$g->image_path) : null,
                'members_count' => $g->members_count,
                'owner_id' => $g->owner_id,
                'owner' => $g->owner ? \App\Support\UserPresenter::public($g->owner) : null,
            ]);

            $posts = ForumPost::where('user_id', $user->id)
                ->withCount(['likes', 'replies'])
                ->orderByDesc('id')
                ->get();
        }

        return response()->json([
            'profile' => UserPresenter::profile($user, $auth),
            'photos' => $photos,
            'groups' => $groups,
            'posts' => $posts ?? [],
            'is_authorized' => $isAuthorized,
        ]);
    }

    // Obtención de datos básicos de un usuario específico
    public function show(Request $request, User $user)
    {
        // Denegación de acceso a la cuenta del administrador
        abort_if(!$request->user()->is_admin && ($user->is_admin || $user->username === 'admin'), 404);

        return response()->json([
            'user' => UserPresenter::profile($user, $request->user()),
        ]);
    }

    // Actualización de los datos de perfil
    public function update(Request $request)
    {
        $user = $request->user();

        // Reglas de validación para la actualización del perfil
        $data = $request->validate([
            'username' => ['sometimes', 'required', 'string', 'max:32', 'regex:/^[a-zA-Z0-9_]+$/', 'unique:users,username,'.$user->id],
            'description' => ['nullable', 'string', 'max:500'],
            'avatar' => ['nullable', 'image', 'max:10240'],
            'name' => ['sometimes', 'string', 'max:255'],
            'is_private' => ['nullable', 'boolean'],
        ]);
 
        if (! empty($data['username'])) {
            $user->username = $data['username'];
            $user->name = $data['username'];
        }
 
        if (array_key_exists('description', $data)) {
            $user->description = $data['description'];
        }
 
        if (! empty($data['name'])) {
            $user->name = $data['name'];
        }
 
        if (array_key_exists('is_private', $data)) {
            $user->is_private = (bool) $data['is_private'];
        }
 
        if ($request->hasFile('avatar')) {
            if ($user->avatar_path && !filter_var($user->avatar_path, FILTER_VALIDATE_URL)) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($user->avatar_path);
            }
            $user->avatar_path = $request->file('avatar')->store('avatars', 'public');
        }
 
        $user->save();
 
        return response()->json([
            'user' => UserPresenter::profile($user->fresh(), $user),
        ]);
    }

    // Cambio de la contraseña de acceso
    public function updatePassword(Request $request)
    {
        // Validación de la longitud mínima de la nueva contraseña
        $request->validate([
            'new_password' => ['required', 'string', 'min:8'],
        ]);
 
        $user = $request->user();
        $user->password = Hash::make($request->new_password);
        $user->save();
 
        return response()->json(['message' => 'Contraseña actualizada con éxito']);
    }

    // Eliminación de la cuenta de usuario
    public function destroy(Request $request)
    {
        $user = $request->user();
        
        if ($user->avatar_path && !filter_var($user->avatar_path, FILTER_VALIDATE_URL)) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($user->avatar_path);
        }
 
        foreach ($user->photos as $photo) {
            if ($photo->image_path) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($photo->image_path);
            }
        }
        
        // Eliminación física del registro de usuario de la base de datos
        $user->delete();
        return response()->json(['message' => 'Cuenta eliminada']);
    }
}
