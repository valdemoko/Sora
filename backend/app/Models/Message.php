<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    protected $fillable = ['conversation_id', 'user_id', 'body', 'image_path'];

    // Conversación a la que pertenece el mensaje
    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    // Remitente del mensaje
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
