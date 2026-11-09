-- CreateEnum
CREATE TYPE "tipo_agenda" AS ENUM ('INDIVIDUAL', 'BANDA');

-- AlterTable
ALTER TABLE "Banda" ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Equipamento" ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Ensaio" (
    "idEnsaio" SERIAL NOT NULL,
    "data" DATE NOT NULL,
    "local" VARCHAR(255),
    "descricao" TEXT,
    "idBanda" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Ensaio_pkey" PRIMARY KEY ("idEnsaio")
);

-- CreateTable
CREATE TABLE "Evento" (
    "idEvento" SERIAL NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "data" DATE NOT NULL,
    "local" VARCHAR(255),
    "descricao" TEXT,
    "idBanda" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Evento_pkey" PRIMARY KEY ("idEvento")
);

-- CreateTable
CREATE TABLE "Evento_Repertorio" (
    "idEvento" INTEGER NOT NULL,
    "idRepertorio" INTEGER NOT NULL,

    CONSTRAINT "Evento_Repertorio_pkey" PRIMARY KEY ("idEvento","idRepertorio")
);

-- CreateTable
CREATE TABLE "Evento_Equipamento" (
    "idEvento" INTEGER NOT NULL,
    "idEquipamento" INTEGER NOT NULL,

    CONSTRAINT "Evento_Equipamento_pkey" PRIMARY KEY ("idEvento","idEquipamento")
);

-- CreateTable
CREATE TABLE "Repertorio" (
    "idRepertorio" SERIAL NOT NULL,
    "musica" VARCHAR(200) NOT NULL,
    "tom" VARCHAR(3),
    "observacao" TEXT,
    "idBanda" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Repertorio_pkey" PRIMARY KEY ("idRepertorio")
);

-- CreateTable
CREATE TABLE "Repertorio_Musico" (
    "idRepertorio" INTEGER NOT NULL,
    "idMusico" INTEGER NOT NULL,
    "funcaoMusico" VARCHAR(150),

    CONSTRAINT "Repertorio_Musico_pkey" PRIMARY KEY ("idRepertorio","idMusico")
);

-- CreateTable
CREATE TABLE "Agenda" (
    "idAgenda" SERIAL NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "descricao" TEXT,
    "data" DATE NOT NULL,
    "horario" VARCHAR(5) NOT NULL,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "criadoPor" VARCHAR(150),
    "tipoAgenda" "tipo_agenda" NOT NULL,
    "visibilidade" "tipo_agenda" NOT NULL DEFAULT 'INDIVIDUAL',
    "idEvento" INTEGER,
    "idBanda" INTEGER,
    "idMusico" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Agenda_pkey" PRIMARY KEY ("idAgenda")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "idFeedback" SERIAL NOT NULL,
    "comentario" TEXT NOT NULL,
    "anonimo" BOOLEAN NOT NULL DEFAULT false,
    "idMusico" INTEGER NOT NULL,
    "idBanda" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("idFeedback")
);

-- CreateIndex
CREATE INDEX "Ensaio_idBanda_idx" ON "Ensaio"("idBanda");

-- CreateIndex
CREATE INDEX "Ensaio_data_idx" ON "Ensaio"("data");

-- CreateIndex
CREATE INDEX "Evento_idBanda_idx" ON "Evento"("idBanda");

-- CreateIndex
CREATE INDEX "Evento_data_idx" ON "Evento"("data");

-- CreateIndex
CREATE INDEX "Evento_Repertorio_idRepertorio_idx" ON "Evento_Repertorio"("idRepertorio");

-- CreateIndex
CREATE INDEX "Evento_Equipamento_idEquipamento_idx" ON "Evento_Equipamento"("idEquipamento");

-- CreateIndex
CREATE INDEX "Repertorio_idBanda_idx" ON "Repertorio"("idBanda");

-- CreateIndex
CREATE INDEX "Repertorio_musica_idx" ON "Repertorio"("musica");

-- CreateIndex
CREATE INDEX "Repertorio_Musico_idMusico_idx" ON "Repertorio_Musico"("idMusico");

-- CreateIndex
CREATE INDEX "Agenda_idBanda_idx" ON "Agenda"("idBanda");

-- CreateIndex
CREATE INDEX "Agenda_idMusico_idx" ON "Agenda"("idMusico");

-- CreateIndex
CREATE INDEX "Agenda_idEvento_idx" ON "Agenda"("idEvento");

-- CreateIndex
CREATE INDEX "Agenda_data_idx" ON "Agenda"("data");

-- CreateIndex
CREATE INDEX "Feedback_idBanda_idx" ON "Feedback"("idBanda");

-- CreateIndex
CREATE INDEX "Feedback_idMusico_idx" ON "Feedback"("idMusico");

-- AddForeignKey
ALTER TABLE "Ensaio" ADD CONSTRAINT "Ensaio_idBanda_fkey" FOREIGN KEY ("idBanda") REFERENCES "Banda"("idBanda") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_idBanda_fkey" FOREIGN KEY ("idBanda") REFERENCES "Banda"("idBanda") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento_Repertorio" ADD CONSTRAINT "Evento_Repertorio_idEvento_fkey" FOREIGN KEY ("idEvento") REFERENCES "Evento"("idEvento") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento_Repertorio" ADD CONSTRAINT "Evento_Repertorio_idRepertorio_fkey" FOREIGN KEY ("idRepertorio") REFERENCES "Repertorio"("idRepertorio") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento_Equipamento" ADD CONSTRAINT "Evento_Equipamento_idEvento_fkey" FOREIGN KEY ("idEvento") REFERENCES "Evento"("idEvento") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento_Equipamento" ADD CONSTRAINT "Evento_Equipamento_idEquipamento_fkey" FOREIGN KEY ("idEquipamento") REFERENCES "Equipamento"("idEquipamento") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Repertorio" ADD CONSTRAINT "Repertorio_idBanda_fkey" FOREIGN KEY ("idBanda") REFERENCES "Banda"("idBanda") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Repertorio_Musico" ADD CONSTRAINT "Repertorio_Musico_idRepertorio_fkey" FOREIGN KEY ("idRepertorio") REFERENCES "Repertorio"("idRepertorio") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Repertorio_Musico" ADD CONSTRAINT "Repertorio_Musico_idMusico_fkey" FOREIGN KEY ("idMusico") REFERENCES "Musico"("idMusico") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agenda" ADD CONSTRAINT "Agenda_idEvento_fkey" FOREIGN KEY ("idEvento") REFERENCES "Evento"("idEvento") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agenda" ADD CONSTRAINT "Agenda_idBanda_fkey" FOREIGN KEY ("idBanda") REFERENCES "Banda"("idBanda") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agenda" ADD CONSTRAINT "Agenda_idMusico_fkey" FOREIGN KEY ("idMusico") REFERENCES "Musico"("idMusico") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_idMusico_fkey" FOREIGN KEY ("idMusico") REFERENCES "Musico"("idMusico") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_idBanda_fkey" FOREIGN KEY ("idBanda") REFERENCES "Banda"("idBanda") ON DELETE CASCADE ON UPDATE CASCADE;
