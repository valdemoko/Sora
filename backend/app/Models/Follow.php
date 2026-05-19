<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Follow extends Model
{
    protected $fillable = ['follower_id', 'following_id', 'accepted'];

    // Usuario seguidor
    public function follower(): BelongsTo
    {
        return $this->belongsTo(User::class, 'follower_id');
    }

    // Usuario seguido
    public function followingUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'following_id');
    }
}
