<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Esta tabla sirve para guardar los "Me gusta" (Likes) de los usuarios de forma polimórfica (likeable) para que sirva tanto para fotos como para posts
        Schema::create('likes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->morphs('likeable');
            $table->timestamps();
            $table->unique(['user_id', 'likeable_type', 'likeable_id']);
        });

        // Esta tabla sirve para gestionar las relaciones de seguimiento (quién sigue a quién) y el estado de aceptación para las cuentas privadas (accepted true/false)
        Schema::create('follows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('follower_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('following_id')->constrained('users')->cascadeOnDelete();
            $table->boolean('accepted')->default(true);
            $table->timestamps();
        });

        // Esta tabla sirve para almacenar las comunidades o grupos que los usuarios pueden crear, con su nombre, biografía y foto de cabecera
        Schema::create('groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('image_path')->nullable();
            $table->timestamps();
        });

        // Esta es la tabla pivote de relación muchos a muchos entre usuarios y grupos, para saber exactamente qué usuarios forman parte de cada comunidad
        Schema::create('group_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('group_user');
        Schema::dropIfExists('groups');
        Schema::dropIfExists('follows');
        Schema::dropIfExists('likes');
    }
};
