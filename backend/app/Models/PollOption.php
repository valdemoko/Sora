<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PollOption extends Model
{
    protected $fillable = ['forum_post_id', 'label', 'position'];

    // Publicación del foro a la que pertenece la encuesta
    public function forumPost(): BelongsTo
    {
        return $this->belongsTo(ForumPost::class);
    }

    // Votos registrados para esta opción específica
    public function votes(): HasMany
    {
        return $this->hasMany(PollVote::class);
    }
}
