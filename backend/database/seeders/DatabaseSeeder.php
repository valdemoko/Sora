<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Photo;
use App\Models\PhotoComment;
use App\Models\ForumPost;
use App\Models\ForumReply;
use App\Models\Group;
use App\Models\PollOption;
use App\Models\PollVote;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Limpieza de datos existentes en todas las tablas
        Schema::disableForeignKeyConstraints();
        User::truncate();
        \App\Models\Like::truncate();
        PhotoComment::truncate();
        Photo::truncate();
        PollVote::truncate();
        PollOption::truncate();
        ForumReply::truncate();
        ForumPost::truncate();
        DB::table('group_user')->truncate();
        DB::table('conversation_user')->truncate();
        Conversation::truncate();
        Message::truncate();
        Group::truncate();
        DB::table('follows')->truncate();
        DB::table('feed_notifications')->truncate();
        DB::table('personal_access_tokens')->truncate();
        Schema::enableForeignKeyConstraints();

        // 2. Crear el único usuario administrador solicitado
        User::create([
            'name' => 'Administrador',
            'username' => 'admin',
            'email' => 'admin@example.com',
            'password' => Hash::make('administrador'),
            'is_admin' => true,
            'profile_completed' => true,
            'is_private' => false,
            'avatar_path' => 'https://api.dicebear.com/9.x/big-ears-neutral/svg?seed=admin',
        ]);
    }
}

