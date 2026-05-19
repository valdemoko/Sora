<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\Request;

class ConversationController extends Controller
{
    // Obtención de todas las conversaciones activas del usuario
    public function index(Request $request)
    {
        $auth = $request->user();

        // Recuperación de conversaciones activas no marcadas como borradas por el usuario
        $conversations = Conversation::whereHas('users', fn ($q) => $q->whereKey($auth->id)->whereNull('conversation_user.deleted_at'))
            ->with(['group', 'users'])
            ->addSelect([
                // Subconsulta para obtener el último mensaje enviado en la conversación
                'last_message_body' => Message::select('body')
                    ->whereColumn('conversation_id', 'conversations.id')
                    ->latest('id')
                    ->limit(1),
                'last_message_at' => Message::select('created_at')
                    ->whereColumn('conversation_id', 'conversations.id')
                    ->latest('id')
                    ->limit(1),
                'last_message_user_id' => Message::select('user_id')
                    ->whereColumn('conversation_id', 'conversations.id')
                    ->latest('id')
                    ->limit(1),
                // Subconsulta para contabilizar los mensajes no leídos
                'unread_count' => Message::selectRaw('count(*)')
                    ->whereColumn('conversation_id', 'conversations.id')
                    ->where('messages.user_id', '!=', $auth->id)
                    ->whereRaw('messages.created_at > (SELECT last_read_at FROM conversation_user WHERE conversation_id = conversations.id AND user_id = ?)', [$auth->id]),
            ])
            ->get();

        $out = [];

        foreach ($conversations as $c) {
            $preview = null;
            if ($c->last_message_at) {
                $preview = [
                    'body' => $c->last_message_body,
                    'user_id' => $c->last_message_user_id,
                    'created_at' => $c->last_message_at,
                ];
            }

            // Mapeo de datos para chats grupales
            if ($c->group_id && $c->group) {
                $out[] = [
                    'id' => $c->id,
                    'is_group' => true,
                    'title' => $c->group->name,
                    'image_url' => $c->group->image_path ? asset('storage/'.$c->group->image_path) : null,
                    'last_message' => $preview,
                    'group_id' => $c->group_id,
                    'unread_count' => (int) $c->unread_count,
                ];
                continue;
            }

            // Mapeo de datos para chats directos (DMs)
            $other = $c->users->first(fn (User $u) => $u->id !== $auth->id);
            
            // Restricción de visualización de chats con administrador para usuarios generales
            if (!$auth->is_admin && $other && ($other->is_admin || $other->username === 'admin')) {
                continue;
            }

            $out[] = [
                'id' => $c->id,
                'is_group' => false,
                'title' => $other?->username ?? 'Chat directo',
                'image_url' => $other && $other->avatar_path ? (filter_var($other->avatar_path, FILTER_VALIDATE_URL) ? $other->avatar_path : asset('storage/'.$other->avatar_path)) : null,
                'other_user_id' => $other?->id,
                'other_username' => $other?->username,
                'last_message' => $preview,
                'group_id' => null,
                'unread_count' => (int) $c->unread_count,
            ];
        }

        // Ordenación de la lista de conversaciones de manera descendente según la fecha del último mensaje
        usort($out, fn ($a, $b) => strcmp(
            ($b['last_message']['created_at'] ?? '') ?: '',
            ($a['last_message']['created_at'] ?? '') ?: ''
        ));

        return response()->json(['conversations' => $out]);
    }

    // Inicialización o recuperación de una conversación directa (DM)
    public function openOrCreateDm(Request $request)
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $auth = $request->user();
        $otherId = (int) $data['user_id'];

        if ($otherId === $auth->id) {
            return response()->json(['message' => 'usuario no válido'], 422);
        }

        // Búsqueda de coincidencia en una conversación privada preexistente entre ambos usuarios
        $conversation = Conversation::whereNull('group_id')
            ->whereHas('users', fn ($q) => $q->whereKey($auth->id))
            ->whereHas('users', fn ($q) => $q->whereKey($otherId))
            ->withCount('users')
            ->get()
            ->firstWhere('users_count', 2);

        if (! $conversation) {
            // Creación desde cero de la conversación privada e inserción de participantes
            $conversation = new Conversation(['group_id' => null]);
            $conversation->save();
            $conversation->users()->sync([$auth->id, $otherId]);
        } else {
            // Restauración del estado activo si la conversación estaba previamente oculta
            $conversation->users()->updateExistingPivot($auth->id, ['deleted_at' => null]);
        }

        return response()->json(['conversation' => ['id' => $conversation->id]]);
    }

    // Obtención de todos los mensajes de una conversación
    public function messages(Request $request, Conversation $conversation)
    {
        $auth = $request->user();
        abort_unless($conversation->users()->whereKey($auth->id)->exists(), 404);

        $messages = Message::where('conversation_id', $conversation->id)
            ->with('user')
            ->orderBy('id')
            ->limit(300)
            ->get();

        // Actualización de la marca temporal de lectura para el usuario solicitante
        $conversation->users()->updateExistingPivot($auth->id, ['last_read_at' => now()]);

        return response()->json([
            'messages' => $messages->map(fn (Message $m) => [
                'id' => $m->id,
                'body' => $m->body,
                'image_url' => $m->image_path ? asset('storage/'.$m->image_path) : null,
                'user_id' => $m->user_id,
                'username' => $m->user?->username,
                'created_at' => $m->created_at?->toIso8601String(),
            ]),
        ]);
    }

    // Envío de un nuevo mensaje en la conversación (soporta texto e imagen adjunta)
    public function sendMessage(Request $request, Conversation $conversation)
    {
        $auth = $request->user();
        abort_unless($conversation->users()->whereKey($auth->id)->exists(), 404);

        $data = $request->validate([
            'body' => ['nullable', 'string', 'max:4000'],
            'image' => ['nullable', 'image', 'max:10240'],
        ]);

        if (empty($data['body']) && ! $request->hasFile('image')) {
            return response()->json(['message' => 'el mensaje no puede estar vacío'], 422);
        }

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('messages', 'public');
        }

        // Persistencia del mensaje en la base de datos
        $message = Message::create([
            'conversation_id' => $conversation->id,
            'user_id' => $auth->id,
            'body' => $data['body'] ?? '',
            'image_path' => $imagePath,
        ]);

        // Restauración de visibilidad de la conversación para todos los participantes
        \Illuminate\Support\Facades\DB::table('conversation_user')
            ->where('conversation_id', $conversation->id)
            ->update(['deleted_at' => null]);
        
        // Marcado de lectura inmediato para el remitente
        $conversation->users()->updateExistingPivot($auth->id, ['last_read_at' => now()]);

        return response()->json([
            'message' => [
                'id' => $message->id,
                'body' => $message->body,
                'image_url' => $message->image_path ? asset('storage/'.$message->image_path) : null,
                'user_id' => $message->user_id,
                'username' => $auth->username,
                'created_at' => $message->created_at?->toIso8601String(),
            ],
        ], 201);
    }

    // Ocultación de la conversación para el usuario actual
    public function destroy(Request $request, Conversation $conversation)
    {
        $auth = $request->user();
        abort_unless($conversation->users()->whereKey($auth->id)->exists(), 404);

        $conversation->users()->updateExistingPivot($auth->id, ['deleted_at' => now()]);

        // Eliminación física definitiva de la base de datos si ha sido descartada por todos los participantes
        $activeCount = $conversation->users()->whereNull('conversation_user.deleted_at')->count();
        if ($activeCount === 0) {
            foreach ($conversation->messages()->whereNotNull('image_path')->get() as $msg) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($msg->image_path);
            }
            $conversation->delete();
        }

        return response()->json(['message' => 'conversación descartada']);
    }
}
