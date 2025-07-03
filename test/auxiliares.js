export const joinAlbums2Artists = (albums, artists) => {
  return albums.map((album) => {
    const nombreArtista = artists.find(
      (artista) => artista.id === album.artista
    ).nombre;
    return {
      id: album.id,
      nombre: album.nombre,
      nombre_artista: nombreArtista,
    };
  });
};

export const joinAlbums2Artists2Songs = (albums, artists, songs) => {
  return songs.map((song) => {
    const album = albums.find((album) => album.id === song.album);
    const nombreArtista = artists.find(
      (artista) => artista.id === album.artista
    ).nombre;
    return {
      id: song.id,
      nombre: song.nombre,
      duracion: song.duracion,
      reproducciones: song.reproducciones,
      nombre_artista: nombreArtista,
      nombre_album: album.nombre,
    };
  });
};

export const addId = (array) => {
  return array.map((item, index) => {
    return { id: index + 1, ...item };
  });
};

export const failIfTimeout = (
  promise,
  timeout = 1000,
  errorMessage = "Se excedió el tiempo de espera"
) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeout)
    ),
  ]);
};

export const timeoutServerResponse = (serverPromise) => {
  return failIfTimeout(
    serverPromise,
    1000,
    "La ruta no devolvió una respuesta en el tiempo esperado. O está tardando mucho, o está crasheando, o no está devolviendo nada."
  );
};
