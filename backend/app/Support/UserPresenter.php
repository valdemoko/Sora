<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Contracts\Auth\Authenticatable;

class UserPresenter
{
    public static function public(User $u, ?Authenticatable $viewer = null): array
    {
        $forSelf = $viewer instanceof User && $viewer->id === $u->id;

        $out = [
            'id' => $u->id,
            'name' => $u->name,
            'username' => $u->username,
            'description' => $u->description,
            'avatar_url' => $u->avatar_path ? (filter_var($u->avatar_path, FILTER_VALIDATE_URL) ? $u->avatar_path : asset('storage/'.$u->avatar_path)) : null,
            'is_admin' => (bool) $u->is_admin,
            'profile_completed' => (bool) $u->profile_completed,
            'is_private' => (bool) $u->is_private,
        ];

        if ($forSelf) {
            $out['email'] = $u->email;
        }

        if ($viewer instanceof User && ! $forSelf) {
            $follow = $viewer->followingUsers()->whereKey($u->id)->first();
            $out['is_following'] = $follow && $follow->pivot->accepted;
            $out['follow_requested'] = $follow && ! $follow->pivot->accepted;
        }

        return $out;
    }

    public static function profile(User $u, ?Authenticatable $viewer = null): array
    {
        $u->loadCount([
            'followers' => fn($q) => $q->where('accepted', true),
            'followingUsers' => fn($q) => $q->where('accepted', true),
            'photos',
            'forumPosts'
        ]);

        return array_merge(self::public($u, $viewer), [
            'followers_count' => $u->followers_count,
            'following_count' => $u->following_users_count,
            'total_posts' => $u->photos_count + $u->forum_posts_count,
            'photos_count' => $u->photos_count,
            'forum_posts_count' => $u->forum_posts_count,
        ]);
    }
}
