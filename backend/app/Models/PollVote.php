<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PollVote extends Model
{
    protected $fillable = ['user_id', 'forum_post_id', 'poll_option_id'];

    // Relación con el usuario que emitió el voto
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Publicación del foro asociada al voto
    public function forumPost()
    {
        return $this->hasOneThrough(ForumPost::class, PollOption::class, 'id', 'id', 'poll_option_id', 'forum_post_id');
    }

    // Opción seleccionada de la encuesta
    public function pollOption(): BelongsTo
    {
        return $this->belongsTo(PollOption::class);
    }
}
