<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Esta tabla sirve para guardar los datos de las imágenes que los usuarios suben a su galería personal (ruta del archivo y pie de foto)
        Schema::create('photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('image_path');
            $table->text('caption')->nullable();
            $table->timestamps();
        });

        // Esta tabla sirve para guardar los comentarios que escribe la gente debajo de las fotos de la galería, relacionando la foto y el autor del comentario
        Schema::create('photo_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('photo_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('body');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('photo_comments');
        Schema::dropIfExists('photos');
    }
};
