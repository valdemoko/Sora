<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\UserPresenter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    // Registra una nueva cuenta de usuario en el sistema
    public function register(Request $request)
    {
        // Comprueba que los datos recibidos (correo, usuario y contraseña) sean correctos y únicos
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'username' => ['required', 'string', 'max:32', 'regex:/^[a-zA-Z0-9_]+$/', 'unique:users,username'],
            'description' => ['nullable', 'string', 'max:500'],
            'avatar' => ['nullable', 'image', 'max:10240'],
        ]);

        // Guarda la foto de perfil subida o genera una foto por defecto usando el nombre de usuario
        if ($request->hasFile('avatar')) {
            $path = $request->file('avatar')->store('avatars', 'public');
        } else {
            $path = "https://api.dicebear.com/9.x/big-ears-neutral/svg?seed=" . urlencode($validated['username']);
        }

        // Guarda el nuevo usuario en la base de datos con su contraseña encriptada
        $user = User::create([
            'username' => $validated['username'],
            'name' => $validated['username'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'description' => $validated['description'] ?? null,
            'avatar_path' => $path,
            'profile_completed' => true,
        ]);

        // Crea un token de seguridad para que el usuario pueda entrar directamente sin volver a identificarse
        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => UserPresenter::public($user->fresh(), $user),
        ]);
    }

    // Permite al usuario iniciar sesión verificando sus credenciales
    public function login(Request $request)
    {
        // Comprueba que se hayan introducido el correo y la contraseña
        $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $request->email)->first();

        // Comprueba si el usuario existe y si la contraseña escrita coincide con la guardada en la base de datos
        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Credenciales no válidas'],
            ]);
        }

        // Crea el token de acceso para la sesión iniciada
        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => UserPresenter::public($user, $user),
        ]);
    }

    // Cierra la sesión eliminando el token de acceso activo
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['ok' => true]);
    }

    // Devuelve los datos del usuario que tiene la sesión abierta
    public function me(Request $request)
    {
        $u = $request->user();
        return response()->json(['user' => UserPresenter::public($u, $u)]);
    }

    // Termina de configurar el perfil del usuario (foto, biografía, etc.) tras registrarse
    public function completeProfile(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'username' => ['required', 'string', 'max:32', 'regex:/^[a-zA-Z0-9_]+$/', 'unique:users,username,'.$user->id],
            'description' => ['nullable', 'string', 'max:500'],
            'avatar' => ['nullable', 'image', 'max:10240'],
        ]);

        if ($request->hasFile('avatar')) {
            $path = $request->file('avatar')->store('avatars', 'public');
        } else {
            $path = $user->avatar_path ?: "https://api.dicebear.com/9.x/big-smile/svg?seed=" . urlencode($data['username']);
        }

        // Guarda los nuevos campos del perfil en la base de datos
        $user->update([
            'username' => $data['username'],
            'description' => $data['description'] ?? null,
            'avatar_path' => $path,
            'name' => $data['username'],
            'profile_completed' => true,
        ]);

        return response()->json([
            'user' => UserPresenter::profile($user->fresh(), $user),
        ]);
    }

    // Permite cambiar la contraseña de una cuenta si se ha olvidado
    public function forgotPassword(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'exists:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::where('email', $data['email'])->first();
        // Guarda la nueva contraseña en la base de datos
        $user->password = $data['password'];
        $user->save();

        return response()->json(['message' => 'contraseña actualizada con éxito']);
    }
}
