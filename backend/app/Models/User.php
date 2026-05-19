<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'username', 'description', 'avatar_path', 'is_admin', 'profile_completed', 'is_private'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    // Casting de los campos de la base de datos
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_admin' => 'boolean',
            'profile_completed' => 'boolean',
            'is_private' => 'boolean',
        ];
    }

    // Galería de fotos subidas por el usuario
    public function photos(): HasMany
    {
        return $this->hasMany(Photo::class);
    }

    // Publicaciones en foros del usuario
    public function forumPosts(): HasMany
    {
        return $this->hasMany(ForumPost::class);
    }

    // Comentarios realizados en fotos de la plataforma
    public function photoComments(): HasMany
    {
        return $this->hasMany(PhotoComment::class);
    }

    // Seguidores de la cuenta del usuario
    public function followers(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'follows', 'following_id', 'follower_id')->withPivot('accepted')->withTimestamps();
    }

    // Cuentas a las que sigue el usuario
    public function followingUsers(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'follows', 'follower_id', 'following_id')->withPivot('accepted')->withTimestamps();
    }

    // Grupos y comunidades de las que forma parte
    public function groups(): BelongsToMany
    {
        return $this->belongsToMany(Group::class)->withTimestamps();
    }

    // Conversaciones de chat activas
    public function conversations(): BelongsToMany
    {
        return $this->belongsToMany(Conversation::class)->withTimestamps();
    }

    // Historial de notificaciones recibidas
    public function feedNotifications(): HasMany
    {
        return $this->hasMany(FeedNotification::class)->orderByDesc('created_at');
    }
}
