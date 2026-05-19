<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FeedNotification;
use Illuminate\Http\Request;

class FeedNotificationController extends Controller
{
    // Obtención de las notificaciones del usuario (límite de 100 registros más recientes)
    public function index(Request $request)
    {
        $items = FeedNotification::where('user_id', $request->user()->id)
            ->with('actor')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();
 
        return response()->json([
            'notifications' => $items->map(fn (FeedNotification $n) => [
                'id' => $n->id,
                'type' => $n->type,
                'read_at' => $n->read_at?->toIso8601String(),
                'data' => $n->data ?? [],
                'created_at' => $n->created_at?->toIso8601String(),
                'actor' => [
                    'id' => $n->actor_id,
                    'username' => $n->actor?->username,
                    'avatar_url' => $n->actor?->avatar_path ? (filter_var($n->actor->avatar_path, FILTER_VALIDATE_URL) ? $n->actor->avatar_path : asset('storage/'.$n->actor->avatar_path)) : null,
                ],
            ]),
        ]);
    }

    // Actualización del estado de lectura de una notificación
    public function markRead(Request $request, FeedNotification $feed_notification)
    {
        abort_unless($feed_notification->user_id === $request->user()->id, 403);
        $feed_notification->read_at = now();
        $feed_notification->save();
        return response()->json(['ok' => true]);
    }

    // Actualización masiva del estado de lectura a leídas
    public function markAllRead(Request $request)
    {
        FeedNotification::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
        return response()->json(['ok' => true]);
    }
}
