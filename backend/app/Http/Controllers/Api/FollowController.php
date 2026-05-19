<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Follow;
use App\Models\User;
use App\Services\Notifier;
use Illuminate\Http\Request;

class FollowController extends Controller
{
    // Registro de una relación de seguimiento (directo o solicitud según privacidad)
    public function store(Request $request, User $user)
    {
        $auth = $request->user();
 
        if ($auth->id === $user->id) {
            return response()->json(['message' => 'no puedes seguirte a ti mismo'], 422);
        }
 
        // Determinación del estado según la privacidad de la cuenta destino
        $accepted = ! $user->is_private;
 
        $follow = Follow::where('follower_id', $auth->id)->where('following_id', $user->id)->first();
 
        if (!$follow) {
            $follow = Follow::create([
                'follower_id' => $auth->id,
                'following_id' => $user->id,
                'accepted' => $accepted
            ]);
            
            // Envío de la notificación correspondiente (seguimiento directo o solicitud de seguimiento)
            $type = $accepted ? 'follow' : 'follow_request';
            Notifier::push($user->id, $auth->id, $type, []);
        }
 
        return response()->json(['ok' => true, 'accepted' => $accepted]);
    }
 
    // Aceptación de una solicitud de seguimiento
    public function accept(Request $request, User $user)
    {
        $auth = $request->user();
        
        // Actualización del estado de la relación de seguimiento a aceptado
        $auth->followers()->updateExistingPivot($user->id, ['accepted' => true]);
        
        // Disparo de notificación de aceptación al solicitante
        Notifier::push($user->id, $auth->id, 'follow_accepted', []);
        
        return response()->json(['ok' => true]);
    }
 
    // Rechazo de una solicitud de seguimiento
    public function reject(Request $request, User $user)
    {
        $auth = $request->user();
        $auth->followers()->detach($user->id);
        return response()->json(['ok' => true]);
    }
 
    // Eliminación de la relación de seguimiento
    public function destroy(Request $request, User $user)
    {
        $auth = $request->user();
        Follow::where('follower_id', $auth->id)->where('following_id', $user->id)->delete();
        return response()->json(['ok' => true]);
    }
}
