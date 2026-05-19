<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FeedNotification extends Model
{
    protected $fillable = ['user_id', 'actor_id', 'type', 'data', 'read_at'];

    // Casting de los atributos del modelo
    protected $casts = [
        'data' => 'array',
        'read_at' => 'datetime',
    ];

    // Destinatario de la notificación
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Usuario que origina la acción notificada
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
