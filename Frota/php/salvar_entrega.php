$diretorio = "uploads/fotos/";
$nome_arquivo = $_POST['os'] . "_" . time() . ".jpg";
move_uploaded_file($_FILES['foto']['tmp_name'], $diretorio . $nome_arquivo);