<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Like extends Model
{
    protected $fillable = ['user_id', 'likeable_type', 'likeable_id'];

    // Usuario que realiza la interacción
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Modelo polimórfico asociado al "Me gusta" (Photo, ForumPost, etc.)
    public function likeable(): MorphTo
    {
        return $this->morphTo();
    }
}
