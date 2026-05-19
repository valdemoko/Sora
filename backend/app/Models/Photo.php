<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Photo extends Model
{
    protected $fillable = ['user_id', 'image_path', 'caption'];

    // Propietario de la foto
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Comentarios registrados en esta foto
    public function comments(): HasMany
    {
        return $this->hasMany(PhotoComment::class);
    }

    // Reacciones de "Me gusta" asociadas a la foto
    public function likes(): MorphMany
    {
        return $this->morphMany(Like::class, 'likeable');
    }
}
