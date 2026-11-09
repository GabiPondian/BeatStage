-- CreateTable
CREATE TABLE "Musico" (
    "idMusico" SERIAL NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "cargo" VARCHAR(150) NOT NULL,
    "fotoPerfil" VARCHAR(500),

    CONSTRAINT "Musico_pkey" PRIMARY KEY ("idMusico")
);

-- CreateIndex
CREATE UNIQUE INDEX "Musico_email_key" ON "Musico"("email");
