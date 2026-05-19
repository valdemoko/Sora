<?php

namespace App\Services;

use App\Models\FeedNotification;

class Notifier
{
    public static function push(int $toUserId, int $actorId, string $type, ?array $data = []): void
    {
        if ($toUserId === $actorId) {
            return;
        }

        FeedNotification::create([
            'user_id' => $toUserId,
            'actor_id' => $actorId,
            'type' => $type,
            'data' => $data ?: [],
        ]);
    }
}
