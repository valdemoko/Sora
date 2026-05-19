<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PhotoComment extends Model
{
    protected $fillable = ['photo_id', 'user_id', 'body'];

    // Foto asociada al comentario
    public function photo(): BelongsTo
    {
        return $this->belongsTo(Photo::class);
    }

    // Usuario que escribió el comentario
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
