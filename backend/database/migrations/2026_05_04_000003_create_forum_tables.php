<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Esta tabla sirve para guardar los posts (publicaciones) principales que los usuarios escriben en la sección de Foros
        Schema::create('forum_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('body');
            $table->boolean('has_poll')->default(false);
            $table->string('image_path')->nullable();
            $table->timestamps();
        });

        // Esta tabla sirve para guardar las respuestas de los foros, conectándolas con el post original y permitiendo respuestas anidadas con parent_id
        Schema::create('forum_replies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('forum_post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('forum_replies')->cascadeOnDelete();
            $table->text('body');
            $table->timestamps();
        });

        // Esta tabla sirve para almacenar las opciones individuales de texto que componen una encuesta dentro de una publicación del foro
        Schema::create('poll_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('forum_post_id')->constrained()->cascadeOnDelete();
            $table->string('label');
            $table->integer('position')->default(0);
            $table->timestamps();
        });

        // Esta tabla sirve para ir registrando qué usuario ha votado a qué opción específica de la encuesta de un post del foro
        Schema::create('poll_votes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('poll_option_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('poll_votes');
        Schema::dropIfExists('poll_options');
        Schema::dropIfExists('forum_replies');
        Schema::dropIfExists('forum_posts');
    }
};
