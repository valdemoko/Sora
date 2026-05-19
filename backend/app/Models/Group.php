<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Group extends Model
{
    protected $fillable = ['owner_id', 'name', 'description', 'image_path'];

    // Creador o administrador del grupo
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    // Miembros asociados al grupo
    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class)->withTimestamps();
    }

    // Conversación de chat de la comunidad
    public function conversation(): HasOne
    {
        return $this->hasOne(Conversation::class);
    }
}
