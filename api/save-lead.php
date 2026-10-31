<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('X-Content-Type-Options: nosniff');

function char_length(string $value): int {
    $count = preg_match_all('/./us', $value, $matches);
    return $count === false ? strlen($value) : $count;
}

function respond(int $status, array $payload): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, ['ok' => false, 'message' => 'Método não permitido.']);
}

$raw = file_get_contents('php://input');
if ($raw === false || strlen($raw) > 32_000) {
    respond(413, ['ok' => false, 'message' => 'O formulário excede o tamanho permitido.']);
}
$data = json_decode($raw, true);
if (!is_array($data)) {
    respond(400, ['ok' => false, 'message' => 'Não foi possível ler os dados enviados.']);
}

// Campo armadilha para reduzir envios automatizados acidentais.
if (!empty($data['website'])) {
    respond(200, ['ok' => true]);
}

$name = trim((string)($data['name'] ?? ''));
$phone = trim((string)($data['phone'] ?? ''));
$email = trim((string)($data['email'] ?? ''));
$company = trim((string)($data['company'] ?? ''));
$city = trim((string)($data['city'] ?? ''));
$interest = trim((string)($data['interest'] ?? ''));
$timeline = trim((string)($data['timeline'] ?? ''));
$productId = trim((string)($data['productId'] ?? ''));
$consent = $data['consent'] ?? false;

if ($name === '' || char_length($name) > 120 || $phone === '' || char_length($phone) > 30) {
    respond(422, ['ok' => false, 'message' => 'Informe nome e telefone válidos.']);
}
if ($email !== '' && (char_length($email) > 180 || filter_var($email, FILTER_VALIDATE_EMAIL) === false)) {
    respond(422, ['ok' => false, 'message' => 'Confira o endereço de e-mail informado.']);
}
if (char_length($company) > 120 || char_length($city) > 100) {
    respond(422, ['ok' => false, 'message' => 'Um dos campos de texto excede o tamanho permitido.']);
}
if (!in_array($interest, ['Comprar um implemento', 'Solicitar cotação', 'Conhecer especificações', 'Renovar / ampliar frota', 'Outro assunto'], true)) {
    respond(422, ['ok' => false, 'message' => 'Selecione uma opção válida em “O que você procura?”.']);
}
if (!in_array($timeline, ['', 'Imediatamente', 'Nos próximos 3 meses', 'Em 3 a 6 meses', 'Estou pesquisando'], true)) {
    respond(422, ['ok' => false, 'message' => 'Selecione um prazo válido.']);
}
if (!in_array($consent, [true, 'on', 'true', 1, '1'], true)) {
    respond(422, ['ok' => false, 'message' => 'É necessário concordar com o uso dos dados para enviar o formulário.']);
}

$root = dirname(__DIR__, 2);
$catalogPath = $root . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'products.json';
$catalog = json_decode((string)@file_get_contents($catalogPath), true);
$launchProduct = null;
if (is_array($catalog)) {
    foreach ($catalog as $item) {
        if (!empty($item['isLaunch'])) { $launchProduct = $item; break; }
    }
}
if (!$launchProduct || $productId !== (string)$launchProduct['id']) {
    respond(422, ['ok' => false, 'message' => 'O formulário está disponível somente para o produto de lançamento configurado.']);
}

$storageDir = $root . DIRECTORY_SEPARATOR . 'storage';
if (!is_dir($storageDir) && !@mkdir($storageDir, 0700, true) && !is_dir($storageDir)) {
    respond(500, ['ok' => false, 'message' => 'Não foi possível preparar o armazenamento local.']);
}
$csvPath = $storageDir . DIRECTORY_SEPARATOR . 'leads.csv';
$handle = @fopen($csvPath, 'c+b');
if ($handle === false) {
    respond(500, ['ok' => false, 'message' => 'Não foi possível gravar os dados neste computador.']);
}

$headers = ['Data e hora', 'Produto', 'ID do produto', 'Nome completo', 'Telefone', 'E-mail', 'Empresa', 'Cidade / Estado', 'Interesse', 'Prazo', 'Consentimento'];
$cleanCell = static function (string $value): string {
    // Proteção básica contra formula injection quando o CSV for aberto em planilhas.
    if (preg_match('/^[\x00-\x20]*[=+\-@]/u', $value) === 1) return "'" . $value;
    return $value;
};

if (!flock($handle, LOCK_EX)) {
    fclose($handle);
    respond(500, ['ok' => false, 'message' => 'Não foi possível bloquear o arquivo de leads para gravação.']);
}
$stat = fstat($handle);
$isEmpty = !$stat || (int)$stat['size'] === 0;
fseek($handle, 0, SEEK_END);
$ok = true;
if ($isEmpty) {
    // BOM UTF-8 para facilitar a abertura das acentuações no Excel.
    $ok = fwrite($handle, "\xEF\xBB\xBF") !== false;
    if ($ok) $ok = fputcsv($handle, $headers, ';', '"', '\\') !== false;
}
$timestamp = (new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d H:i:s');
$row = [
    $timestamp,
    (string)$launchProduct['name'],
    (string)$launchProduct['id'],
    $name,
    $phone,
    $email,
    $company,
    $city,
    $interest,
    $timeline,
    'Sim'
];
$row = array_map($cleanCell, $row);
if ($ok) $ok = fputcsv($handle, $row, ';', '"', '\\') !== false;
fflush($handle);
flock($handle, LOCK_UN);
fclose($handle);
@chmod($csvPath, 0600);

if (!$ok) {
    respond(500, ['ok' => false, 'message' => 'Não foi possível concluir a gravação do lead. Tente novamente.']);
}
respond(200, ['ok' => true, 'message' => 'Lead registrado com sucesso.']);
