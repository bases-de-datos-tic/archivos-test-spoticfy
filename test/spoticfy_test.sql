BEGIN;

--
-- Drop existing tables if they exist
--

DROP TABLE IF EXISTS albumes CASCADE;
DROP TABLE IF EXISTS artistas CASCADE;
DROP TABLE IF EXISTS canciones CASCADE;

--
-- Table structure for table albumes
--

CREATE TABLE albumes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,
  artista INTEGER NOT NULL
);


-- --------------------------------------------------------

--
-- Table structure for table artistas
--

CREATE TABLE artistas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL
);


--
-- Table structure for table canciones
--

CREATE TABLE canciones (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,
  album INTEGER NOT NULL,
  duracion INTEGER NOT NULL,
  reproducciones INTEGER NOT NULL
);

--
-- Add foreign key constraints
--

ALTER TABLE albumes 
  ADD CONSTRAINT fk_albumes_artista 
  FOREIGN KEY (artista) REFERENCES artistas(id);

ALTER TABLE canciones 
  ADD CONSTRAINT fk_canciones_album 
  FOREIGN KEY (album) REFERENCES albumes(id);

COMMIT;
