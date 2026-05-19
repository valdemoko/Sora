<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ConversationController;
use App\Http\Controllers\Api\FeedNotificationController;
use App\Http\Controllers\Api\FollowController;
use App\Http\Controllers\Api\ForumPostController;
use App\Http\Controllers\Api\ForumReplyController;
use App\Http\Controllers\Api\GroupController;
use App\Http\Controllers\Api\PhotoController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\SearchController;
use Illuminate\Support\Facades\Route;

// Rutas públicas (no necesitas estar logueado)
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);

// Rutas protegidas (necesitas estar logueado)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/profile/complete', [AuthController::class, 'completeProfile']);

    // Gestión del perfil
    Route::patch('/profile', [ProfileController::class, 'update']);
    Route::post('/profile/password', [ProfileController::class, 'updatePassword']);
    Route::delete('/profile', [ProfileController::class, 'destroy']);
    Route::get('/users/{user:username}', [ProfileController::class, 'show']);
    Route::get('/users/{user:username}/studio', [ProfileController::class, 'studio']);

    // Seguir a otros usuarios
    Route::post('/users/{user:username}/follow', [FollowController::class, 'store']);
    Route::delete('/users/{user:username}/follow', [FollowController::class, 'destroy']);
    Route::post('/users/{user:username}/follow/accept', [FollowController::class, 'accept']);
    Route::post('/users/{user:username}/follow/reject', [FollowController::class, 'reject']);

    // Fotos
    Route::get('/photos/carousel', [PhotoController::class, 'carousel']);
    Route::post('/photos', [PhotoController::class, 'store']);
    Route::get('/photos/{photo}/comments', [PhotoController::class, 'comments']);
    Route::post('/photos/{photo}/comments', [PhotoController::class, 'addComment']);
    Route::post('/photos/{photo}/like', [PhotoController::class, 'toggleLike']);
    Route::patch('/photos/{photo}', [PhotoController::class, 'update']);
    Route::delete('/photos/{photo}', [PhotoController::class, 'destroy']);

    // Foro (Posts y Respuestas)
    Route::get('/forum-posts', [ForumPostController::class, 'index']);
    Route::post('/forum-posts', [ForumPostController::class, 'store']);
    Route::get('/forum-posts/{forum_post}', [ForumPostController::class, 'show']);
    Route::post('/forum-posts/{forum_post}/like', [ForumPostController::class, 'toggleLike']);
    Route::post('/forum-posts/{forum_post}/vote', [ForumPostController::class, 'vote']);
    Route::post('/forum-posts/{forum_post}/replies', [ForumReplyController::class, 'store']);
    Route::patch('/forum-posts/{forum_post}', [ForumPostController::class, 'update']);
    Route::delete('/forum-posts/{forum_post}', [ForumPostController::class, 'destroy']);

    // Grupos
    Route::get('/groups', [GroupController::class, 'index']);
    Route::post('/groups', [GroupController::class, 'store']);
    Route::get('/groups/{group}', [GroupController::class, 'show']);
    Route::match(['PATCH', 'POST'], '/groups/{group}', [GroupController::class, 'update']);
    Route::delete('/groups/{group}', [GroupController::class, 'destroy']);
    Route::post('/groups/{group}/join', [GroupController::class, 'join']);
    Route::post('/groups/{group}/leave', [GroupController::class, 'leave']);

    // Chats y Conversaciones
    Route::get('/conversations', [ConversationController::class, 'index']);
    Route::post('/conversations/dm', [ConversationController::class, 'openOrCreateDm']);
    Route::get('/conversations/{conversation}/messages', [ConversationController::class, 'messages']);
    Route::post('/conversations/{conversation}/messages', [ConversationController::class, 'sendMessage']);
    Route::delete('/conversations/{conversation}', [ConversationController::class, 'destroy']);

    // Notificaciones
    Route::get('/notifications', [FeedNotificationController::class, 'index']);
    Route::post('/notifications/read-all', [FeedNotificationController::class, 'markAllRead']);
    Route::patch('/notifications/{feed_notification}/read', [FeedNotificationController::class, 'markRead']);

    // Buscador
    Route::get('/search', [SearchController::class, 'search']);

    // Rutas de administrador
    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/stats', [AdminController::class, 'stats']);
        Route::get('/users', [AdminController::class, 'users']);
        Route::post('/users/{user}/toggle-admin', [AdminController::class, 'toggleAdmin']);
        Route::delete('/users/{user}', [AdminController::class, 'deleteUser']);
        Route::delete('/forum-posts/{forum_post}', [AdminController::class, 'deleteForumPost']);
        Route::delete('/forum-replies/{forum_reply}', [AdminController::class, 'deleteForumReply']);
        Route::delete('/photos/{photo}', [AdminController::class, 'deletePhoto']);
        Route::delete('/photo-comments/{photo_comment}', [AdminController::class, 'deletePhotoComment']);
        Route::get('/moderation', [AdminController::class, 'recentContent']);
    });
});
