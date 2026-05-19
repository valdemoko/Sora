<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ForumPost;
use App\Models\ForumReply;
use App\Models\Like;
use App\Services\Notifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ForumReplyController extends Controller
{
    // Adición de una respuesta a un post del foro
    public function store(Request $request, ForumPost $forumPost)
    {
        $data = $request->validate([
            'body' => ['required', 'string', 'max:4000'],
            'parent_id' => ['nullable', 'integer'], // Identificador de la respuesta a la que se contesta (hilo)
        ]);

        $auth = $request->user();

        $parentReply = null;
        if (! empty($data['parent_id'])) {
            $parentReply = ForumReply::whereKey($data['parent_id'])->where('forum_post_id', $forumPost->id)->first();
            if (! $parentReply) return response()->json(['message' => 'respuesta no válida'], 422);
        }

        $reply = ForumReply::create([
            'forum_post_id' => $forumPost->id,
            'user_id' => $auth->id,
            'parent_id' => $data['parent_id'] ?? null,
            'body' => $data['body'],
        ]);

        // Disparo de notificaciones (al autor del post o al autor de la respuesta respondida)
        if ($parentReply) {
            Notifier::push($parentReply->user_id, $auth->id, 'comment_reply', ['forum_post_id' => $forumPost->id, 'reply_id' => $reply->id]);
        } else {
            Notifier::push($forumPost->user_id, $auth->id, 'comment_post', ['forum_post_id' => $forumPost->id]);
        }

        return response()->json([
            'reply' => [
                'id' => $reply->id,
                'forum_post_id' => $reply->forum_post_id,
                'parent_id' => $reply->parent_id,
                'body' => $reply->body,
                'likes_count' => 0,
                'liked_by_me' => false,
                'user' => \App\Support\UserPresenter::public($auth),
                'created_at' => $reply->created_at?->toIso8601String(),
            ],
        ], 201);
    }
}
