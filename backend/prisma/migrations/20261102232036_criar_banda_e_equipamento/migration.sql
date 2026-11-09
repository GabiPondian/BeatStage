-- CreateEnum
CREATE TYPE "estado_equipamento" AS ENUM ('PROPRIO', 'EMPRESTADO');

-- CreateTable
CREATE TABLE "Banda" (
    "idBanda" SERIAL NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "descricao" TEXT,
    "codigoConvite" VARCHAR(20) NOT NULL,
    "idLider" INTEGER NOT NULL,

    CONSTRAINT "Banda_pkey" PRIMARY KEY ("idBanda")
);

-- CreateTable
CREATE TABLE "Banda_Membro" (
    "idBanda" INTEGER NOT NULL,
    "idMusico" INTEGER NOT NULL,

    CONSTRAINT "Banda_Membro_pkey" PRIMARY KEY ("idBanda","idMusico")
);

-- CreateTable
CREATE TABLE "Equipamento" (
    "idEquipamento" SERIAL NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "estado" "estado_equipamento" NOT NULL,
    "responsavel" VARCHAR(150),
    "descricao" TEXT,
    "idBanda" INTEGER NOT NULL,

    CONSTRAINT "Equipamento_pkey" PRIMARY KEY ("idEquipamento")
);

-- CreateIndex
CREATE UNIQUE INDEX "Banda_codigoConvite_key" ON "Banda"("codigoConvite");

-- CreateIndex
CREATE INDEX "Banda_idLider_idx" ON "Banda"("idLider");

-- CreateIndex
CREATE INDEX "Banda_Membro_idMusico_idx" ON "Banda_Membro"("idMusico");

-- CreateIndex
CREATE INDEX "Equipamento_idBanda_idx" ON "Equipamento"("idBanda");

-- AddForeignKey
ALTER TABLE "Banda" ADD CONSTRAINT "Banda_idLider_fkey" FOREIGN KEY ("idLider") REFERENCES "Musico"("idMusico") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Banda_Membro" ADD CONSTRAINT "Banda_Membro_idBanda_fkey" FOREIGN KEY ("idBanda") REFERENCES "Banda"("idBanda") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Banda_Membro" ADD CONSTRAINT "Banda_Membro_idMusico_fkey" FOREIGN KEY ("idMusico") REFERENCES "Musico"("idMusico") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipamento" ADD CONSTRAINT "Equipamento_idBanda_fkey" FOREIGN KEY ("idBanda") REFERENCES "Banda"("idBanda") ON DELETE CASCADE ON UPDATE CASCADE;
