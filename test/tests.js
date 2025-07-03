import request from "supertest";
import { app, server } from "../index.js";
import { newDb } from "pg-mem";
import fs from "fs";
import sinon from "sinon";
import { dbController } from "../db.js";
import { expect } from "chai";
import {
    addId,
    joinAlbums2Artists,
    joinAlbums2Artists2Songs,
    timeoutServerResponse,
} from "./auxiliares.js";

let database;
let dbLog = [];
let resetDatabase;

const OBJ_EXPECTED_MSG = "¡OJO! Tienen que devolver un objeto";
const JOIN_HINT_MSG =
    "TIP: Fijate que estés devolviendo los campos correctos. ¿Te falta algún JOIN?";

before(() => {
    // Cerrar servidor porque no quiero que interfiera
    server.close();
    // PG-mem
    database = newDb();
    const query = fs.readFileSync("test/spoticfy_test.sql", {
        encoding: "utf8",
        flag: "r",
    });
    database.public.none(query);
    database.on("query-failed", (sql) => {
        dbLog.push(sql);
        console.log("Query", dbLog);
    });
    const backup = database.backup();
    resetDatabase = () => {
        backup.restore();
        dbLog = [];
    };
    const { Pool } = database.adapters.createPg();
    // Pisado de controller
    sinon.replace(dbController, "pool", new Pool());

    database.on("query-failed", (sql) => {
        console.log("Query failed:", sql);
    });
});

after(() => {
    sinon.restore();
});

describe("GET /", () => {
    it("Informa que la API está funcionando", async () => {
        const res = await timeoutServerResponse(
            request(app).get("/").expect(200)
        );
        expect(res.text).to.equal("SpoTICfy API working!");
    });
});

describe("GET /albumes", () => {
    const albumes = [
        { nombre: "La Base de los Datos", artista: 1 },
        { nombre: "Ya lo sabIA", artista: 1 },
        { nombre: "No es Java", artista: 2 },
    ];
    const artistas = [{ nombre: "Lean" }, { nombre: "Nacho" }];
    const expectedAlbums = joinAlbums2Artists(addId(albumes), addId(artistas));
    beforeEach(() => {
        artistas.forEach((artista) =>
            database.public.getTable("artistas").insert(artista)
        );
        albumes.forEach((album) =>
            database.public.getTable("albumes").insert(album)
        );
    });
    afterEach(() => {
        resetDatabase();
    });
    it("Devuelve todos los albumes", async () => {
        const res = await timeoutServerResponse(
            request(app)
                .get("/albumes")
                .expect(200)
                .expect("Content-Type", /json/)
        );
        const obtainedAlbums = res.body;
        expect(obtainedAlbums).instanceOf(Array);
        expect(obtainedAlbums).to.have.lengthOf(expectedAlbums.length);
        expect(obtainedAlbums).to.have.deep.members(
            expectedAlbums,
            JOIN_HINT_MSG
        );
    });
});

describe("GET /albumes/:id", () => {
    const albumes = [
        { nombre: "La Base de los Datos", artista: 1 },
        { nombre: "Ya lo sabIA", artista: 1 },
        { nombre: "No es Java", artista: 2 },
    ];
    const artistas = [{ nombre: "Lean" }, { nombre: "Nacho" }];
    beforeEach(() => {
        artistas.forEach((artista) =>
            database.public.getTable("artistas").insert(artista)
        );
        albumes.forEach((album) =>
            database.public.getTable("albumes").insert(album)
        );
    });
    afterEach(() => {
        resetDatabase();
    });
    it("Devuelve el album especificado por id", async () => {
        const res = await timeoutServerResponse(
            request(app)
                .get("/albumes/2")
                .expect(200)
                .expect("Content-Type", /json/)
        );
        const obtainedAlbum = res.body;
        expect(obtainedAlbum).to.be.an("object", OBJ_EXPECTED_MSG);
        expect(obtainedAlbum).to.have.keys("id", "nombre", "nombre_artista");
        expect(obtainedAlbum).to.have.property("id", 2);
        expect(obtainedAlbum).to.have.property("nombre", "Ya lo sabIA");
        expect(obtainedAlbum).to.have.property("nombre_artista", "Lean");
    });
});

describe("POST /albumes", () => {
    const albumes = [
        { nombre: "La Base de los Datos", artista: 1 },
        { nombre: "Ya lo sabIA", artista: 1 },
        { nombre: "No es Java", artista: 2 },
    ];
    const artistas = [{ nombre: "Lean" }, { nombre: "Nacho" }];
    beforeEach(() => {
        artistas.forEach((artista) =>
            database.public.getTable("artistas").insert(artista)
        );
        albumes.forEach((album) =>
            database.public.getTable("albumes").insert(album)
        );
    });
    afterEach(() => {
        resetDatabase();
    });
    it("Inserta un album de un artista existente", async () => {
        const res = await timeoutServerResponse(
            request(app)
                .post("/albumes")
                .send({
                    nombre: "Muchachos",
                    artista: 1, // Lean
                })
                .expect(201)
        );
        const obtainedAlbum = res.body;
        expect(obtainedAlbum).to.be.an("object", OBJ_EXPECTED_MSG);
        expect(obtainedAlbum).to.have.property("nombre", "Muchachos");
        // Check database
        const insertedAlbum = database.public
            .getTable("albumes")
            .find({ nombre: "Muchachos" });
        expect(
            insertedAlbum,
            "No se encontró el album en la base de datos"
        ).to.have.lengthOf(1);
        expect(insertedAlbum[0]).to.have.property("nombre", "Muchachos");
        expect(insertedAlbum[0]).to.have.property("artista", 1);
    });
});

describe("PUT /albumes/:id", () => {
    const albumes = [
        { nombre: "La Base de los Datos", artista: 1 },
        { nombre: "Ya lo sabIA", artista: 1 },
        { nombre: "No es Java", artista: 2 },
    ];
    const artistas = [{ nombre: "Lean" }, { nombre: "Nacho" }];
    beforeEach(() => {
        artistas.forEach((artista) =>
            database.public.getTable("artistas").insert(artista)
        );
        albumes.forEach((album) =>
            database.public.getTable("albumes").insert(album)
        );
    });
    afterEach(() => {
        resetDatabase();
    });
    it("Actualiza el nombre y el artista de un album existente", async () => {
        const res = await timeoutServerResponse(
            request(app)
                .put("/albumes/2")
                .send({
                    nombre: "Paradigma Funcional",
                    artista: 2, // Nacho
                })
                .expect(200)
        );
        const obtainedAlbum = res.body;
        expect(obtainedAlbum).to.be.an("object", OBJ_EXPECTED_MSG);
        expect(obtainedAlbum).to.have.property("nombre", "Paradigma Funcional");
        expect(obtainedAlbum).to.have.property("artista", 2);
        const modifiedAlbums = addId(albumes);
        modifiedAlbums[1] = {
            id: 2,
            nombre: "Paradigma Funcional",
            artista: 2,
        };
        const dbAlbums = database.public.getTable("albumes").find();
        expect(dbAlbums).to.have.lengthOf(modifiedAlbums.length);
        expect(dbAlbums).to.include.deep.members(modifiedAlbums);
    });
});

describe("DEL /albumes/:id", () => {
    const albumes = [
        { nombre: "La Base de los Datos", artista: 1 },
        { nombre: "Ya lo sabIA", artista: 1 },
        { nombre: "No es Java", artista: 2 },
    ];
    const artistas = [{ nombre: "Lean" }, { nombre: "Nacho" }];
    const canciones = [
        {
            nombre: "Momento pgAdmin ft. Nacho",
            duracion: 180,
            reproducciones: 100,
            album: 1,
        },
        {
            nombre: "Sos el WHERE de mi SELECT",
            duracion: 200,
            reproducciones: 150,
            album: 2,
        },
        {
            nombre: "Es JavaScript",
            duracion: 240,
            reproducciones: 200,
            album: 1,
        },
    ];
    beforeEach(() => {
        artistas.forEach((artista) =>
            database.public.getTable("artistas").insert(artista)
        );
        albumes.forEach((album) =>
            database.public.getTable("albumes").insert(album)
        );
    });
    afterEach(() => {
        resetDatabase();
    });
    it("Elimina un album SIN CANCIONES en base al ID", async () => {
        await timeoutServerResponse(
            request(app).delete("/albumes/2").expect(204)
        );
        const remainingAlbums = addId(albumes);
        remainingAlbums.splice(1, 1);
        const dbAlbums = database.public.getTable("albumes").find();
        expect(dbAlbums).to.have.lengthOf(remainingAlbums.length);
        expect(dbAlbums).to.include.deep.members(remainingAlbums);
    });
    it("No puede eliminar un album CON CANCIONES en base al ID", async () => {
        canciones.forEach((cancion) =>
            database.public.getTable("canciones").insert(cancion)
        );
        await timeoutServerResponse(
            request(app)
                .delete("/albumes/1")
                .expect(400)
        ).catch((err) => {
            throw new Error(
                `${err.message}. ¡OJO! No podés eliminar un album que tiene canciones. Es MUY PROBABLE que tu problema sea que no estás mirando si el album tiene canciones antes de eliminarlo.`
            );
        });
    });
});

describe("GET /albumes/:id/canciones", () => {
    const albumes = [
        { nombre: "La Base de los Datos", artista: 1 },
        { nombre: "Ya lo sabIA", artista: 1 },
        { nombre: "No es Java", artista: 2 },
    ];
    const artistas = [{ nombre: "Lean" }, { nombre: "Nacho" }];
    const canciones = [
        {
            nombre: "Momento pgAdmin ft. Nacho",
            duracion: 180,
            reproducciones: 100,
            album: 1,
        },
        {
            nombre: "Sos el WHERE de mi SELECT",
            duracion: 200,
            reproducciones: 150,
            album: 2,
        },
        {
            nombre: "Es JavaScript",
            duracion: 240,
            reproducciones: 200,
            album: 1,
        },
    ];
    beforeEach(() => {
        artistas.forEach((artista) =>
            database.public.getTable("artistas").insert(artista)
        );
        albumes.forEach((album) =>
            database.public.getTable("albumes").insert(album)
        );
        canciones.forEach((cancion) =>
            database.public.getTable("canciones").insert(cancion)
        );
    });
    afterEach(() => {
        resetDatabase();
    });
    it("Obtiene todos las canciones de un album", async () => {
        const res = await timeoutServerResponse(
            request(app)
                .get("/albumes/1/canciones")
                .expect(200)
                .expect("Content-Type", /json/)
        );
        const obtainedSongs = res.body;
        expect(obtainedSongs).instanceOf(Array);
        expect(obtainedSongs).to.have.lengthOf(2);
        expect(obtainedSongs).to.have.deep.members(
            [
                {
                    id: 1,
                    nombre: "Momento pgAdmin ft. Nacho",
                    duracion: 180,
                    reproducciones: 100,
                    nombre_artista: "Lean",
                    nombre_album: "La Base de los Datos",
                },
                {
                    id: 3,
                    nombre: "Es JavaScript",
                    duracion: 240,
                    reproducciones: 200,
                    nombre_artista: "Lean",
                    nombre_album: "La Base de los Datos",
                },
            ],
            JOIN_HINT_MSG
        );
    });
});

describe("GET /canciones", () => {
    const albumes = [
        { nombre: "La Base de los Datos", artista: 1 },
        { nombre: "Ya lo sabIA", artista: 1 },
        { nombre: "No es Java", artista: 2 },
    ];
    const artistas = [{ nombre: "Lean" }, { nombre: "Nacho" }];
    const canciones = [
        {
            nombre: "Momento pgAdmin ft. Nacho",
            duracion: 180,
            reproducciones: 100,
            album: 1,
        },
        {
            nombre: "Sos el WHERE de mi SELECT",
            duracion: 200,
            reproducciones: 150,
            album: 3,
        },
        {
            nombre: "Es JavaScript",
            duracion: 240,
            reproducciones: 200,
            album: 1,
        },
    ];
    const expectedSongs = joinAlbums2Artists2Songs(
        addId(albumes),
        addId(artistas),
        addId(canciones)
    );
    beforeEach(() => {
        artistas.forEach((artista) =>
            database.public.getTable("artistas").insert(artista)
        );
        albumes.forEach((album) =>
            database.public.getTable("albumes").insert(album)
        );
        canciones.forEach((cancion) =>
            database.public.getTable("canciones").insert(cancion)
        );
    });
    afterEach(() => {
        resetDatabase();
    });
    it("Devuelve todas las canciones", async () => {
        const res = await timeoutServerResponse(
            request(app)
                .get("/canciones")
                .expect(200)
                .expect("Content-Type", /json/)
        );
        const obtainedSongs = res.body;
        expect(obtainedSongs).instanceOf(Array);
        expect(obtainedSongs).to.have.lengthOf(expectedSongs.length);
        expect(obtainedSongs).to.have.deep.members(
            expectedSongs,
            JOIN_HINT_MSG
        );
    });
});

describe("GET /canciones/:id", () => {
    const albumes = [
        { nombre: "La Base de los Datos", artista: 1 },
        { nombre: "Ya lo sabIA", artista: 1 },
        { nombre: "No es Java", artista: 2 },
    ];
    const artistas = [{ nombre: "Lean" }, { nombre: "Nacho" }];
    const canciones = [
        {
            nombre: "Momento pgAdmin ft. Nacho",
            duracion: 180,
            reproducciones: 100,
            album: 1,
        },
        {
            nombre: "Sos el WHERE de mi SELECT",
            duracion: 200,
            reproducciones: 150,
            album: 3,
        },
        {
            nombre: "Es JavaScript",
            duracion: 240,
            reproducciones: 200,
            album: 1,
        },
    ];
    beforeEach(() => {
        artistas.forEach((artista) =>
            database.public.getTable("artistas").insert(artista)
        );
        albumes.forEach((album) =>
            database.public.getTable("albumes").insert(album)
        );
        canciones.forEach((cancion) =>
            database.public.getTable("canciones").insert(cancion)
        );
    });
    afterEach(() => {
        resetDatabase();
    });
    it("Devuelve la canción especificada por id", async () => {
        const res = await timeoutServerResponse(
            request(app)
                .get("/canciones/2")
                .expect(200)
                .expect("Content-Type", /json/)
        );
        const obtainedSong = res.body;
        expect(obtainedSong).to.be.an("object", OBJ_EXPECTED_MSG);
        expect(obtainedSong).to.have.keys(
            "id",
            "nombre",
            "duracion",
            "reproducciones",
            "nombre_artista",
            "nombre_album"
        );
        expect(obtainedSong).to.have.property("id", 2);
        expect(obtainedSong).to.have.property(
            "nombre",
            "Sos el WHERE de mi SELECT"
        );
        expect(obtainedSong).to.have.property("duracion", 200);
        expect(obtainedSong).to.have.property("reproducciones", 150);
        expect(obtainedSong).to.have.property("nombre_artista", "Nacho");
        expect(obtainedSong).to.have.property("nombre_album", "No es Java");
    });
});

describe("POST /canciones", () => {
    const albumes = [
        { nombre: "La Base de los Datos", artista: 1 },
        { nombre: "Ya lo sabIA", artista: 1 },
        { nombre: "No es Java", artista: 2 },
    ];
    const artistas = [{ nombre: "Lean" }, { nombre: "Nacho" }];
    const canciones = [
        {
            nombre: "Momento pgAdmin ft. Nacho",
            duracion: 180,
            reproducciones: 100,
            album: 1,
        },
        {
            nombre: "Sos el WHERE de mi SELECT",
            duracion: 200,
            reproducciones: 150,
            album: 3,
        },
        {
            nombre: "Es JavaScript",
            duracion: 240,
            reproducciones: 200,
            album: 1,
        },
    ];
    beforeEach(() => {
        artistas.forEach((artista) =>
            database.public.getTable("artistas").insert(artista)
        );
        albumes.forEach((album) =>
            database.public.getTable("albumes").insert(album)
        );
        canciones.forEach((cancion) =>
            database.public.getTable("canciones").insert(cancion)
        );
    });
    afterEach(() => {
        resetDatabase();
    });
    it("Crea una canción de un album existente", async () => {
        const res = await timeoutServerResponse(
            request(app)
                .post("/canciones")
                .send({
                    nombre: "Un 1 para el que diga Java",
                    duracion: 180,
                    album: 3, // No es Java
                })
                .expect(201)
        );
        const obtainedSong = res.body;
        expect(obtainedSong).to.be.an("object", OBJ_EXPECTED_MSG);
        expect(obtainedSong).to.have.property(
            "nombre",
            "Un 1 para el que diga Java"
        );
        expect(obtainedSong).to.have.property("duracion", 180);
        expect(obtainedSong).to.have.property("album", 3);
        // Check database
        const insertedSong = database.public
            .getTable("canciones")
            .find({ nombre: "Un 1 para el que diga Java" });
        expect(
            insertedSong,
            "No se encontró la canción en la base de datos"
        ).to.have.lengthOf(1);
        expect(insertedSong[0]).to.have.property(
            "nombre",
            "Un 1 para el que diga Java"
        );
        expect(insertedSong[0]).to.have.property("duracion", 180);
        expect(insertedSong[0]).to.have.property("album", 3);
        expect(insertedSong[0]).to.have.property("reproducciones", 0);
    });
});

describe("PUT /canciones/:id", () => {
    const albumes = [
        { nombre: "La Base de los Datos", artista: 1 },
        { nombre: "Ya lo sabIA", artista: 1 },
        { nombre: "No es Java", artista: 2 },
    ];
    const artistas = [{ nombre: "Lean" }, { nombre: "Nacho" }];
    const canciones = [
        {
            nombre: "Momento pgAdmin ft. Nacho",
            duracion: 180,
            reproducciones: 100,
            album: 1,
        },
        {
            nombre: "Sos el WHERE de mi SELECT",
            duracion: 200,
            reproducciones: 150,
            album: 3,
        },
        {
            nombre: "Es JavaScript",
            duracion: 240,
            reproducciones: 200,
            album: 1,
        },
    ];
    beforeEach(() => {
        artistas.forEach((artista) =>
            database.public.getTable("artistas").insert(artista)
        );
        albumes.forEach((album) =>
            database.public.getTable("albumes").insert(album)
        );
        canciones.forEach((cancion) =>
            database.public.getTable("canciones").insert(cancion)
        );
    });
    afterEach(() => {
        resetDatabase();
    });
    it("Actualiza el nombre, album y duración  de una canción existente", async () => {
        const res = await timeoutServerResponse(
            request(app)
                .put("/canciones/1")
                .send({
                    nombre: "El COUNT de momentos JOIN",
                    duracion: 300,
                    album: 2,
                })
                .expect(200)
        );
        const obtainedSong = res.body;
        expect(obtainedSong).to.be.an("object", OBJ_EXPECTED_MSG);
        expect(obtainedSong).to.have.property(
            "nombre",
            "El COUNT de momentos JOIN"
        );
        expect(obtainedSong).to.have.property("duracion", 300);
        expect(obtainedSong).to.have.property("album", 2);
        // Check database
        const modifiedSong = addId(canciones);
        modifiedSong[0] = {
            id: 1,
            nombre: "El COUNT de momentos JOIN",
            duracion: 300,
            reproducciones: 100,
            album: 2,
        };
        const dbSongs = database.public.getTable("canciones").find();
        expect(dbSongs).to.have.lengthOf(modifiedSong.length);
        expect(dbSongs).to.include.deep.members(modifiedSong);
    });
});

describe("DEL /canciones/:id", () => {
    const albumes = [
        { nombre: "La Base de los Datos", artista: 1 },
        { nombre: "Ya lo sabIA", artista: 1 },
        { nombre: "No es Java", artista: 2 },
    ];
    const artistas = [{ nombre: "Lean" }, { nombre: "Nacho" }];
    const canciones = [
        {
            nombre: "Momento pgAdmin ft. Nacho",
            duracion: 180,
            reproducciones: 100,
            album: 1,
        },
        {
            nombre: "Sos el WHERE de mi SELECT",
            duracion: 200,
            reproducciones: 150,
            album: 3,
        },
        {
            nombre: "Es JavaScript",
            duracion: 240,
            reproducciones: 200,
            album: 1,
        },
    ];
    beforeEach(() => {
        artistas.forEach((artista) =>
            database.public.getTable("artistas").insert(artista)
        );
        albumes.forEach((album) =>
            database.public.getTable("albumes").insert(album)
        );
        canciones.forEach((cancion) =>
            database.public.getTable("canciones").insert(cancion)
        );
    });
    afterEach(() => {
        resetDatabase();
    });
    it("Elimina una canción en base al ID", async () => {
        await timeoutServerResponse(
            request(app).delete("/canciones/3").expect(204)
        );
        const remainingSongs = addId(canciones);
        remainingSongs.splice(2, 1);
        const dbSongs = database.public.getTable("canciones").find();
        expect(dbSongs).to.have.lengthOf(remainingSongs.length);
        expect(dbSongs).to.include.deep.members(remainingSongs);
    });
});

describe("PUT /canciones/:id/reproducir", () => {
    const albumes = [
        { nombre: "La Base de los Datos", artista: 1 },
        { nombre: "Ya lo sabIA", artista: 1 },
        { nombre: "No es Java", artista: 2 },
    ];
    const artistas = [{ nombre: "Lean" }, { nombre: "Nacho" }];
    const canciones = [
        {
            nombre: "Momento pgAdmin ft. Nacho",
            duracion: 180,
            reproducciones: 100,
            album: 1,
        },
        {
            nombre: "Sos el WHERE de mi SELECT",
            duracion: 200,
            reproducciones: 150,
            album: 3,
        },
        {
            nombre: "Es JavaScript",
            duracion: 240,
            reproducciones: 200,
            album: 1,
        },
    ];
    beforeEach(() => {
        artistas.forEach((artista) =>
            database.public.getTable("artistas").insert(artista)
        );
        albumes.forEach((album) =>
            database.public.getTable("albumes").insert(album)
        );
        canciones.forEach((cancion) =>
            database.public.getTable("canciones").insert(cancion)
        );
    });
    afterEach(() => {
        resetDatabase();
    });
    it("Reproduce la canción especificada por id", async () => {
        await timeoutServerResponse(
            request(app).put("/canciones/3/reproducir").expect(204)
        );
        const dbSongs = database.public.getTable("canciones").find({ id: 3 });
        expect(dbSongs).to.have.lengthOf(1);
        expect(dbSongs[0]).to.have.property("reproducciones", 201);
    });
});
