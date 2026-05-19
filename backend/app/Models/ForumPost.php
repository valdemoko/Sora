<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class ForumPost extends Model
{
    protected $fillable = ['user_id', 'body', 'has_poll', 'image_path'];

    protected $casts = [
        'has_poll' => 'boolean',
    ];

    // Autor de la publicación
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Opciones asociadas a la encuesta (si aplica)
    public function pollOptions(): HasMany
    {
        return $this->hasMany(PollOption::class)->orderBy('position');
    }

    // Historial de votos registrados en la encuesta
    public function pollVotes()
    {
        return $this->hasManyThrough(PollVote::class, PollOption::class, 'forum_post_id', 'poll_option_id');
    }

    // Respuestas de primer nivel (sin respuesta padre)
    public function replies(): HasMany
    {
        return $this->hasMany(ForumReply::class)->whereNull('parent_id')->orderBy('created_at');
    }

    // Respuestas totales del post (incluyendo respuestas anidadas)
    public function allReplies(): HasMany
    {
        return $this->hasMany(ForumReply::class)->orderBy('created_at');
    }

    // Reacciones de "Me gusta" asociadas a la publicación
    public function likes(): MorphMany
    {
        return $this->morphMany(Like::class, 'likeable');
    }
}
