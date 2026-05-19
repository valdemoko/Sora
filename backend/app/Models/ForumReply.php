<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class ForumReply extends Model
{
    protected $fillable = ['forum_post_id', 'user_id', 'parent_id', 'body'];

    // Publicación del foro a la que pertenece la respuesta
    public function forumPost(): BelongsTo
    {
        return $this->belongsTo(ForumPost::class);
    }

    // Autor de la respuesta
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Respuesta padre de la cual es hilo secundario
    public function parent(): BelongsTo
    {
        return $this->belongsTo(ForumReply::class, 'parent_id');
    }

    // Hilos o respuestas anidadas secundarias
    public function children(): HasMany
    {
        return $this->hasMany(ForumReply::class, 'parent_id')->orderBy('created_at');
    }

    // Reacciones de "Me gusta" asociadas a la respuesta
    public function likes(): MorphMany
    {
        return $this->morphMany(Like::class, 'likeable');
    }
}
