<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Group;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GroupController extends Controller
{
    // Obtención del listado de comunidades registradas
    public function index()
    {
        $groups = Group::with(['owner'])->withCount('members')->get();
        return response()->json([
            'groups' => $groups->map(fn (Group $g) => $this->presentGroup($g)),
        ]);
    }

    // Registro de una nueva comunidad con su canal de chat asociado
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:2000'],
            'image' => ['nullable', 'image', 'max:10240'],
        ]);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('groups', 'public');
        }

        // Creación atómica del grupo, adscripción del creador e inicialización de la conversación
        $group = DB::transaction(function () use ($request, $data, $imagePath) {
            $group = Group::create([
                'owner_id' => $request->user()->id,
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'image_path' => $imagePath,
            ]);

            $group->members()->attach($request->user()->id);

            $conversation = Conversation::create(['group_id' => $group->id]);
            $conversation->users()->attach($request->user()->id);

            return $group;
        });

        $group->load(['owner'])->loadCount('members');

        return response()->json(['group' => $this->presentGroup($group)], 201);
    }

    // Obtención de datos específicos de una comunidad
    public function show(Group $group)
    {
        $group->load(['owner'])->loadCount('members');
        return response()->json(['group' => $this->presentGroup($group)]);
    }

    // Adscripción de un usuario al grupo y a su chat
    public function join(Request $request, Group $group)
    {
        $user = $request->user();
        $group->members()->syncWithoutDetaching([$user->id]);

        $conversation = $group->conversation;
        if ($conversation) {
            $conversation->users()->syncWithoutDetaching([$user->id]);
        }

        $group->loadCount('members');

        return response()->json([
            'group' => $this->presentGroup($group),
            'joined' => true,
            'conversation_id' => $conversation?->id,
        ]);
    }

    // Actualización de los datos del grupo (restringido al propietario)
    public function update(Request $request, Group $group)
    {
        abort_if($group->owner_id !== $request->user()->id, 403);
 
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:2000'],
            'image' => ['nullable', 'image', 'max:10240'],
        ]);
 
        if (isset($data['name'])) $group->name = $data['name'];
        if (array_key_exists('description', $data)) $group->description = $data['description'];
        if ($request->hasFile('image')) {
            $group->image_path = $request->file('image')->store('groups', 'public');
        }
 
        $group->save();
 
        return response()->json(['group' => $this->presentGroup($group->loadCount('members'))]);
    }
 
    // Eliminación definitiva del grupo
    public function destroy(Request $request, Group $group)
    {
        abort_if($group->owner_id !== $request->user()->id, 403);
        $group->delete();
        return response()->json(['ok' => true]);
    }

    // Abandono de un usuario del grupo (restringido para el propietario)
    public function leave(Request $request, Group $group)
    {
        $user = $request->user();
        if ($group->owner_id === $user->id) {
            return response()->json(['message' => 'El propietario no puede abandonar la comunidad'], 403);
        }

        $group->members()->detach($user->id);

        $conversation = $group->conversation;
        if ($conversation) {
            $conversation->users()->detach($user->id);
        }

        return response()->json(['message' => 'Abandono del grupo confirmado']);
    }

    // Formateador DTO del grupo para salida JSON
    protected function presentGroup(Group $g): array
    {
        return [
            'id' => $g->id,
            'name' => $g->name,
            'description' => $g->description,
            'image_url' => $g->image_path ? asset('storage/'.$g->image_path) : null,
            'members_count' => $g->members_count ?? $g->members()->count(),
            'owner_id' => $g->owner_id,
            'owner' => $g->owner ? \App\Support\UserPresenter::public($g->owner) : null,
        ];
    }
}
