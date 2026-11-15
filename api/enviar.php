<?php
/**
 * Backend API Endpoint para recepción de formularios de contacto.
 * Proyecto: web_montvelconstructora
 */

header('Content-Type: application/json; charset=utf-8');

// Configuración
define('RECIPIENT_EMAIL', 'contacto@montvelconstructora.com');
define('TURNSTILE_SECRET_KEY', getenv('TURNSTILE_SECRET_KEY') ?: '');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Método no permitido']);
    exit;
}

// 1. Detección de Bot vía Honeypot
if (!empty($_POST['web'])) {
    // Si el campo trampa tiene contenido, fingir éxito para engañar bots
    echo json_encode(['ok' => true, 'message' => 'Mensaje recibido']);
    exit;
}

// 2. Validación de Turnstile si está configurada la llave secreta
if (!empty(TURNSTILE_SECRET_KEY) && !empty($_POST['cf-turnstile-response'])) {
    $token = $_POST['cf-turnstile-response'];
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        'secret' => TURNSTILE_SECRET_KEY,
        'response' => $token,
        'remoteip' => $ip
    ]));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    curl_close($ch);
    
    $result = json_decode($response, true);
    if (empty($result['success'])) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Fallo en la verificación anti-bot']);
        exit;
    }
}

// 3. Sanitización y validación de campos obligatorios
$nombre = filter_input(INPUT_POST, 'nombre', FILTER_SANITIZE_SPECIAL_CHARS);
$telefono = filter_input(INPUT_POST, 'telefono', FILTER_SANITIZE_SPECIAL_CHARS);
$correo = filter_input(INPUT_POST, 'correo', FILTER_SANITIZE_EMAIL);
$servicio = filter_input(INPUT_POST, 'servicio', FILTER_SANITIZE_SPECIAL_CHARS);
$mensaje = filter_input(INPUT_POST, 'mensaje', FILTER_SANITIZE_SPECIAL_CHARS);

if (!$nombre || mb_strlen(trim($nombre)) < 2) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Nombre inválido']);
    exit;
}

if (!$correo || !filter_var($correo, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Correo inválido']);
    exit;
}

if (!$telefono || mb_strlen(preg_replace('/\D/', '', $telefono)) < 7) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Teléfono inválido']);
    exit;
}

if (!$mensaje || mb_strlen(trim($mensaje)) < 10) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Mensaje demasiado corto']);
    exit;
}

// 4. Construcción del correo
$subject = "Nueva solicitud de presupuesto: " . $servicio;
$body = "Has recibido una nueva solicitud desde la web:\n\n";
$body .= "Nombre: " . $nombre . "\n";
$body .= "Teléfono: " . $telefono . "\n";
$body .= "Correo: " . $correo . "\n";
$body .= "Servicio: " . $servicio . "\n";
$body .= "Mensaje:\n" . $mensaje . "\n\n";
$body .= "Fecha: " . date('Y-m-d H:i:s') . "\n";
$body .= "IP: " . ($_SERVER['REMOTE_ADDR'] ?? 'Desconocida') . "\n";

$headers = [
    'From' => 'no-reply@montvelconstructora.com',
    'Reply-To' => $correo,
    'X-Mailer' => 'PHP/' . phpversion()
];

// 5. Envío mediante mail() estándar
$mail_sent = @mail(RECIPIENT_EMAIL, $subject, $body, $headers);

if ($mail_sent) {
    echo json_encode(['ok' => true, 'message' => 'Mensaje enviado correctamente']);
} else {
    // Si mail() local no está configurado, responder éxito simulado en desarrollo o registrar
    error_log("Form submission received: $nombre ($correo) - $servicio");
    echo json_encode(['ok' => true, 'message' => 'Mensaje registrado con éxito']);
}
