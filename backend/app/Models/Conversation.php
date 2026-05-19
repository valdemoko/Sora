<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Conversation extends Model
{
    protected $fillable = ['group_id'];

    // Grupo o comunidad asociado a la conversación (si aplica)
    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }

    // Participantes de la conversación de chat
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)->withPivot(['last_read_at', 'deleted_at'])->withTimestamps();
    }

    // Mensajes pertenecientes a la conversación
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class)->orderBy('created_at');
    }
}
