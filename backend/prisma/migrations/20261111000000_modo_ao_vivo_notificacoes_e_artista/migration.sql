-- AlterTable
-- Artista da música: usado para busca de letras e exibição no repertório.
ALTER TABLE "Repertorio" ADD COLUMN "artista" VARCHAR(150);

-- CreateTable
CREATE TABLE "LiveSessao" (
    "idEvento" INTEGER NOT NULL,
    "idBanda" INTEGER NOT NULL,
    "idRepertorioAtual" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PARADO',
    "iniciadoEm" TIMESTAMP(3),
    "musicaIniciadaEm" TIMESTAMP(3),
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveSessao_pkey" PRIMARY KEY ("idEvento")
);

-- CreateTable
CREATE TABLE "Notificacao" (
    "idNotificacao" SERIAL NOT NULL,
    "idMusico" INTEGER NOT NULL,
    "idBanda" INTEGER NOT NULL,
    "idEvento" INTEGER,
    "idRepertorio" INTEGER,
    "tipo" VARCHAR(30) NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("idNotificacao")
);

-- CreateIndex
CREATE INDEX "LiveSessao_idBanda_idx" ON "LiveSessao"("idBanda");

-- CreateIndex
CREATE INDEX "Notificacao_idMusico_lida_idx" ON "Notificacao"("idMusico", "lida");

-- CreateIndex
CREATE INDEX "Notificacao_idBanda_idx" ON "Notificacao"("idBanda");

-- CreateIndex
CREATE INDEX "Notificacao_idEvento_idx" ON "Notificacao"("idEvento");

-- AddForeignKey
ALTER TABLE "LiveSessao" ADD CONSTRAINT "LiveSessao_idEvento_fkey" FOREIGN KEY ("idEvento") REFERENCES "Evento"("idEvento") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveSessao" ADD CONSTRAINT "LiveSessao_idRepertorioAtual_fkey" FOREIGN KEY ("idRepertorioAtual") REFERENCES "Repertorio"("idRepertorio") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_idMusico_fkey" FOREIGN KEY ("idMusico") REFERENCES "Musico"("idMusico") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_idBanda_fkey" FOREIGN KEY ("idBanda") REFERENCES "Banda"("idBanda") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_idEvento_fkey" FOREIGN KEY ("idEvento") REFERENCES "Evento"("idEvento") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_idRepertorio_fkey" FOREIGN KEY ("idRepertorio") REFERENCES "Repertorio"("idRepertorio") ON DELETE SET NULL ON UPDATE CASCADE;
