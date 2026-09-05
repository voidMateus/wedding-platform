export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      acompanhantes_avulsos: {
        Row: {
          casamento_id: string
          convite_id: string
          created_at: string
          excluido_em: string | null
          id: string
          nome_completo: string
          restricoes_alimentares: string | null
          updated_at: string
        }
        Insert: {
          casamento_id: string
          convite_id: string
          created_at?: string
          excluido_em?: string | null
          id?: string
          nome_completo: string
          restricoes_alimentares?: string | null
          updated_at?: string
        }
        Update: {
          casamento_id?: string
          convite_id?: string
          created_at?: string
          excluido_em?: string | null
          id?: string
          nome_completo?: string
          restricoes_alimentares?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companions_invite_id_fkey"
            columns: ["convite_id"]
            isOneToOne: false
            referencedRelation: "convites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companions_wedding_id_fkey"
            columns: ["casamento_id"]
            isOneToOne: false
            referencedRelation: "casamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      assinaturas: {
        Row: {
          casamento_id: string | null
          conta_id: string | null
          created_at: string
          id: string
          iniciado_em: string
          plano_id: string
          updated_at: string
        }
        Insert: {
          casamento_id?: string | null
          conta_id?: string | null
          created_at?: string
          id?: string
          iniciado_em?: string
          plano_id: string
          updated_at?: string
        }
        Update: {
          casamento_id?: string | null
          conta_id?: string | null
          created_at?: string
          id?: string
          iniciado_em?: string
          plano_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_wedding_id_fkey"
            columns: ["casamento_id"]
            isOneToOne: true
            referencedRelation: "casamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      casamentos: {
        Row: {
          arquivado_em: string | null
          config_conteudo: Json | null
          config_faixas_etarias: Json
          config_tema: Json
          created_at: string
          data_evento: string
          handle_infinitepay: string | null
          horario_evento: string | null
          id: string
          modo_entrega_presente_fisico: string
          modo_lista_convidados: string
          nomes_noivos: string
          prazo_rsvp: string | null
          slug: string
          status_ciclo_vida: string
          updated_at: string
        }
        Insert: {
          arquivado_em?: string | null
          config_conteudo?: Json | null
          config_faixas_etarias?: Json
          config_tema?: Json
          created_at?: string
          data_evento: string
          handle_infinitepay?: string | null
          horario_evento?: string | null
          id?: string
          modo_entrega_presente_fisico?: string
          modo_lista_convidados?: string
          nomes_noivos: string
          prazo_rsvp?: string | null
          slug: string
          status_ciclo_vida?: string
          updated_at?: string
        }
        Update: {
          arquivado_em?: string | null
          config_conteudo?: Json | null
          config_faixas_etarias?: Json
          config_tema?: Json
          created_at?: string
          data_evento?: string
          handle_infinitepay?: string | null
          horario_evento?: string | null
          id?: string
          modo_entrega_presente_fisico?: string
          modo_lista_convidados?: string
          nomes_noivos?: string
          prazo_rsvp?: string | null
          slug?: string
          status_ciclo_vida?: string
          updated_at?: string
        }
        Relationships: []
      }
      categorias_presentes: {
        Row: {
          casamento_id: string
          created_at: string
          id: string
          nome: string
          ordem_exibicao: number
          updated_at: string
        }
        Insert: {
          casamento_id: string
          created_at?: string
          id?: string
          nome: string
          ordem_exibicao?: number
          updated_at?: string
        }
        Update: {
          casamento_id?: string
          created_at?: string
          id?: string
          nome?: string
          ordem_exibicao?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_categories_wedding_id_fkey"
            columns: ["casamento_id"]
            isOneToOne: false
            referencedRelation: "casamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      comunicacoes: {
        Row: {
          aberto_em: string | null
          canal: string
          casamento_id: string
          created_at: string
          credencial_id: string
          enviado_em: string | null
          id: string
          tipo: string
          updated_at: string
        }
        Insert: {
          aberto_em?: string | null
          canal: string
          casamento_id: string
          created_at?: string
          credencial_id: string
          enviado_em?: string | null
          id?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          aberto_em?: string | null
          canal?: string
          casamento_id?: string
          created_at?: string
          credencial_id?: string
          enviado_em?: string | null
          id?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communications_access_token_id_fkey"
            columns: ["credencial_id"]
            isOneToOne: false
            referencedRelation: "credenciais_acesso_convite"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_wedding_id_fkey"
            columns: ["casamento_id"]
            isOneToOne: false
            referencedRelation: "casamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      conexoes_galeria: {
        Row: {
          casamento_id: string
          created_at: string
          criado_por: string | null
          escopo_token: string | null
          id: string
          id_pasta: string
          modo: string
          nome_pasta: string | null
          provedor: string
          status_conexao: string
          token_acesso_cifrado: string | null
          token_expira_em: string | null
          token_renovacao_cifrado: string | null
          ultima_contagem_fotos: number | null
          ultima_sincronizacao_em: string | null
          ultimo_erro_sincronizacao: string | null
          updated_at: string
        }
        Insert: {
          casamento_id: string
          created_at?: string
          criado_por?: string | null
          escopo_token?: string | null
          id?: string
          id_pasta: string
          modo: string
          nome_pasta?: string | null
          provedor: string
          status_conexao?: string
          token_acesso_cifrado?: string | null
          token_expira_em?: string | null
          token_renovacao_cifrado?: string | null
          ultima_contagem_fotos?: number | null
          ultima_sincronizacao_em?: string | null
          ultimo_erro_sincronizacao?: string | null
          updated_at?: string
        }
        Update: {
          casamento_id?: string
          created_at?: string
          criado_por?: string | null
          escopo_token?: string | null
          id?: string
          id_pasta?: string
          modo?: string
          nome_pasta?: string | null
          provedor?: string
          status_conexao?: string
          token_acesso_cifrado?: string | null
          token_expira_em?: string | null
          token_renovacao_cifrado?: string | null
          ultima_contagem_fotos?: number | null
          ultima_sincronizacao_em?: string | null
          ultimo_erro_sincronizacao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_source_connections_created_by_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "membros_casamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_source_connections_wedding_id_fkey"
            columns: ["casamento_id"]
            isOneToOne: true
            referencedRelation: "casamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      contadores_uso: {
        Row: {
          casamento_id: string
          contagem_convidados: number
          storage_usado_mb: number
          updated_at: string
        }
        Insert: {
          casamento_id: string
          contagem_convidados?: number
          storage_usado_mb?: number
          updated_at?: string
        }
        Update: {
          casamento_id?: string
          contagem_convidados?: number
          storage_usado_mb?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_counters_wedding_id_fkey"
            columns: ["casamento_id"]
            isOneToOne: true
            referencedRelation: "casamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      contribuicoes_presentes: {
        Row: {
          casamento_id: string
          contribuido_em: string
          convidado_id: string | null
          convite_id: string | null
          created_at: string
          id: string
          mensagem: string | null
          nome_contribuinte: string | null
          presente_id: string
          quantidade_cotas: number | null
          telefone_presenteador: string | null
          updated_at: string
          valor_centavos: number
        }
        Insert: {
          casamento_id: string
          contribuido_em?: string
          convidado_id?: string | null
          convite_id?: string | null
          created_at?: string
          id?: string
          mensagem?: string | null
          nome_contribuinte?: string | null
          presente_id: string
          quantidade_cotas?: number | null
          telefone_presenteador?: string | null
          updated_at?: string
          valor_centavos: number
        }
        Update: {
          casamento_id?: string
          contribuido_em?: string
          convidado_id?: string | null
          convite_id?: string | null
          created_at?: string
          id?: string
          mensagem?: string | null
          nome_contribuinte?: string | null
          presente_id?: string
          quantidade_cotas?: number | null
          telefone_presenteador?: string | null
          updated_at?: string
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "gift_contributions_gift_id_fkey"
            columns: ["presente_id"]
            isOneToOne: false
            referencedRelation: "presentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_contributions_group_id_fkey"
            columns: ["convite_id"]
            isOneToOne: false
            referencedRelation: "convites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_contributions_guest_id_fkey"
            columns: ["convidado_id"]
            isOneToOne: false
            referencedRelation: "convidados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_contributions_wedding_id_fkey"
            columns: ["casamento_id"]
            isOneToOne: false
            referencedRelation: "casamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      convidados: {
        Row: {
          apelido: string | null
          caminho_foto: string | null
          casamento_id: string
          convite_id: string | null
          created_at: string
          data_nascimento: string | null
          email: string | null
          excluido_em: string | null
          faixa_etaria_manual: string | null
          grupo_id: string | null
          id: string
          nome_completo: string
          nucleo_id: string | null
          observacoes: string | null
          ordem_nucleo: number
          papel_casamento: string | null
          restricoes_alimentares: string | null
          sexo: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          apelido?: string | null
          caminho_foto?: string | null
          casamento_id: string
          convite_id?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          excluido_em?: string | null
          faixa_etaria_manual?: string | null
          grupo_id?: string | null
          id?: string
          nome_completo: string
          nucleo_id?: string | null
          observacoes?: string | null
          ordem_nucleo?: number
          papel_casamento?: string | null
          restricoes_alimentares?: string | null
          sexo?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          apelido?: string | null
          caminho_foto?: string | null
          casamento_id?: string
          convite_id?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          excluido_em?: string | null
          faixa_etaria_manual?: string | null
          grupo_id?: string | null
          id?: string
          nome_completo?: string
          nucleo_id?: string | null
          observacoes?: string | null
          ordem_nucleo?: number
          papel_casamento?: string | null
          restricoes_alimentares?: string | null
          sexo?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guests_group_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_invite_id_fkey"
            columns: ["convite_id"]
            isOneToOne: false
            referencedRelation: "convites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_party_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "nucleos_acompanhantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_wedding_id_fkey"
            columns: ["casamento_id"]
            isOneToOne: false
            referencedRelation: "casamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      convites: {
        Row: {
          arquivado_em: string | null
          casamento_id: string
          codigo_interno: string
          convidado_responsavel_id: string | null
          created_at: string
          enviado_em: string | null
          excluido_em: string | null
          id: string
          max_acompanhantes: number | null
          mensagem_rsvp: string | null
          mensagem_rsvp_em: string | null
          nome: string
          observacoes: string | null
          status_convite: string
          updated_at: string
        }
        Insert: {
          arquivado_em?: string | null
          casamento_id: string
          codigo_interno: string
          convidado_responsavel_id?: string | null
          created_at?: string
          enviado_em?: string | null
          excluido_em?: string | null
          id?: string
          max_acompanhantes?: number | null
          mensagem_rsvp?: string | null
          mensagem_rsvp_em?: string | null
          nome: string
          observacoes?: string | null
          status_convite?: string
          updated_at?: string
        }
        Update: {
          arquivado_em?: string | null
          casamento_id?: string
          codigo_interno?: string
          convidado_responsavel_id?: string | null
          created_at?: string
          enviado_em?: string | null
          excluido_em?: string | null
          id?: string
          max_acompanhantes?: number | null
          mensagem_rsvp?: string | null
          mensagem_rsvp_em?: string | null
          nome?: string
          observacoes?: string | null
          status_convite?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_groups_wedding_id_fkey"
            columns: ["casamento_id"]
            isOneToOne: false
            referencedRelation: "casamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_responsible_guest_id_fkey"
            columns: ["convidado_responsavel_id"]
            isOneToOne: false
            referencedRelation: "convidados"
            referencedColumns: ["id"]
          },
        ]
      }
      credenciais_acesso_convite: {
        Row: {
          casamento_id: string
          codigo_cifrado: string | null
          codigo_hash: string
          convite_id: string
          created_at: string
          id: string
          revogado_em: string | null
          updated_at: string
        }
        Insert: {
          casamento_id: string
          codigo_cifrado?: string | null
          codigo_hash: string
          convite_id: string
          created_at?: string
          id?: string
          revogado_em?: string | null
          updated_at?: string
        }
        Update: {
          casamento_id?: string
          codigo_cifrado?: string | null
          codigo_hash?: string
          convite_id?: string
          created_at?: string
          id?: string
          revogado_em?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_access_tokens_invite_id_fkey"
            columns: ["convite_id"]
            isOneToOne: false
            referencedRelation: "convites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_access_tokens_wedding_id_fkey"
            columns: ["casamento_id"]
            isOneToOne: false
            referencedRelation: "casamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      etapas_evento: {
        Row: {
          casamento_id: string
          cidade_local: string | null
          complemento_local: string | null
          created_at: string
          endereco_local: string | null
          estado_local: string | null
          id: string
          inicia_em: string | null
          latitude_local: number | null
          logradouro_local: string | null
          longitude_local: number | null
          mesmo_local_que: string | null
          nome_local: string | null
          numero_local: string | null
          ordem_exibicao: number
          origem_local: string | null
          place_id_local: string | null
          provedor_local: string | null
          termina_em: string | null
          titulo: string
          updated_at: string
          url_imagem: string | null
          url_mapa_local: string | null
        }
        Insert: {
          casamento_id: string
          cidade_local?: string | null
          complemento_local?: string | null
          created_at?: string
          endereco_local?: string | null
          estado_local?: string | null
          id?: string
          inicia_em?: string | null
          latitude_local?: number | null
          logradouro_local?: string | null
          longitude_local?: number | null
          mesmo_local_que?: string | null
          nome_local?: string | null
          numero_local?: string | null
          ordem_exibicao?: number
          origem_local?: string | null
          place_id_local?: string | null
          provedor_local?: string | null
          termina_em?: string | null
          titulo: string
          updated_at?: string
          url_imagem?: string | null
          url_mapa_local?: string | null
        }
        Update: {
          casamento_id?: string
          cidade_local?: string | null
          complemento_local?: string | null
          created_at?: string
          endereco_local?: string | null
          estado_local?: string | null
          id?: string
          inicia_em?: string | null
          latitude_local?: number | null
          logradouro_local?: string | null
          longitude_local?: number | null
          mesmo_local_que?: string | null
          nome_local?: string | null
          numero_local?: string | null
          ordem_exibicao?: number
          origem_local?: string | null
          place_id_local?: string | null
          provedor_local?: string | null
          termina_em?: string | null
          titulo?: string
          updated_at?: string
          url_imagem?: string | null
          url_mapa_local?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_segments_same_venue_as_fkey"
            columns: ["mesmo_local_que"]
            isOneToOne: false
            referencedRelation: "etapas_evento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_segments_wedding_id_fkey"
            columns: ["casamento_id"]
            isOneToOne: false
            referencedRelation: "casamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      etiquetas_convite: {
        Row: {
          casamento_id: string
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          casamento_id: string
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          casamento_id?: string
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_tags_wedding_id_fkey"
            columns: ["casamento_id"]
            isOneToOne: false
            referencedRelation: "casamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      fotos: {
        Row: {
          caminho_storage: string | null
          casamento_id: string
          conexao_id: string | null
          created_at: string
          enviado_por: string | null
          foco_x: number
          foco_y: number
          id: string
          id_arquivo_origem: string | null
          legenda: string | null
          ordem_exibicao: number
          tipo_mime_origem: string | null
          updated_at: string
          url_miniatura_origem: string | null
        }
        Insert: {
          caminho_storage?: string | null
          casamento_id: string
          conexao_id?: string | null
          created_at?: string
          enviado_por?: string | null
          foco_x?: number
          foco_y?: number
          id?: string
          id_arquivo_origem?: string | null
          legenda?: string | null
          ordem_exibicao?: number
          tipo_mime_origem?: string | null
          updated_at?: string
          url_miniatura_origem?: string | null
        }
        Update: {
          caminho_storage?: string | null
          casamento_id?: string
          conexao_id?: string | null
          created_at?: string
          enviado_por?: string | null
          foco_x?: number
          foco_y?: number
          id?: string
          id_arquivo_origem?: string | null
          legenda?: string | null
          ordem_exibicao?: number
          tipo_mime_origem?: string | null
          updated_at?: string
          url_miniatura_origem?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_source_connection_id_fkey"
            columns: ["conexao_id"]
            isOneToOne: false
            referencedRelation: "conexoes_galeria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_uploaded_by_fkey"
            columns: ["enviado_por"]
            isOneToOne: false
            referencedRelation: "membros_casamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_wedding_id_fkey"
            columns: ["casamento_id"]
            isOneToOne: false
            referencedRelation: "casamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      funcionalidades_habilitadas: {
        Row: {
          casamento_id: string | null
          chave: string
          conta_id: string | null
          created_at: string
          habilitado: boolean
          id: string
          updated_at: string
        }
        Insert: {
          casamento_id?: string | null
          chave: string
          conta_id?: string | null
          created_at?: string
          habilitado?: boolean
          id?: string
          updated_at?: string
        }
        Update: {
          casamento_id?: string | null
          chave?: string
          conta_id?: string | null
          created_at?: string
          habilitado?: boolean
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entitlements_wedding_id_fkey"
            columns: ["casamento_id"]
            isOneToOne: false
            referencedRelation: "casamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      grupos: {
        Row: {
          casamento_id: string
          cor: string | null
          created_at: string
          excluido_em: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          casamento_id: string
          cor?: string | null
          created_at?: string
          excluido_em?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          casamento_id?: string
          cor?: string | null
          created_at?: string
          excluido_em?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_wedding_id_fkey"
            columns: ["casamento_id"]
            isOneToOne: false
            referencedRelation: "casamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_convite: {
        Row: {
          casamento_id: string
          convite_id: string
          id: string
          metadados: Json
          ocorrido_em: string
          tipo_evento: string
        }
        Insert: {
          casamento_id: string
          convite_id: string
          id?: string
          metadados?: Json
          ocorrido_em?: string
          tipo_evento: string
        }
        Update: {
          casamento_id?: string
          convite_id?: string
          id?: string
          metadados?: Json
          ocorrido_em?: string
          tipo_evento?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_events_invite_id_fkey"
            columns: ["convite_id"]
            isOneToOne: false
            referencedRelation: "convites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_events_wedding_id_fkey"
            columns: ["casamento_id"]
            isOneToOne: false
            referencedRelation: "casamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      membros_casamento: {
        Row: {
          casamento_id: string
          created_at: string
          id: string
          papel: string
          updated_at: string
          usuario_id: string
        }
        Insert: {
          casamento_id: string
          created_at?: string
          id?: string
          papel: string
          updated_at?: string
          usuario_id: string
        }
        Update: {
          casamento_id?: string
          created_at?: string
          id?: string
          papel?: string
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedding_members_wedding_id_fkey"
            columns: ["casamento_id"]
            isOneToOne: false
            referencedRelation: "casamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      nucleos_acompanhantes: {
        Row: {
          casamento_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          casamento_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          casamento_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_parties_wedding_id_fkey"
            columns: ["casamento_id"]
            isOneToOne: false
            referencedRelation: "casamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      operadores_plataforma: {
        Row: {
          created_at: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          usuario_id?: string
        }
        Relationships: []
      }
      pagamentos_presentes: {
        Row: {
          casamento_id: string
          confirmado_em: string | null
          contribuicao_resultante_id: string | null
          convite_id: string | null
          created_at: string
          id: string
          mensagem_convidado: string | null
          motivo_falha: string | null
          nome_presenteador: string
          nsu_pedido_provedor: string
          nsu_transacao_provedor: string | null
          presente_id: string
          quantidade_cotas: number | null
          reserva_resultante_id: string | null
          slug_fatura_provedor: string | null
          status_pagamento: string
          telefone_presenteador: string | null
          tipo: string
          ultima_resposta_provedor: Json | null
          updated_at: string
          url_checkout_provedor: string | null
          valor_centavos: number
        }
        Insert: {
          casamento_id: string
          confirmado_em?: string | null
          contribuicao_resultante_id?: string | null
          convite_id?: string | null
          created_at?: string
          id?: string
          mensagem_convidado?: string | null
          motivo_falha?: string | null
          nome_presenteador: string
          nsu_pedido_provedor: string
          nsu_transacao_provedor?: string | null
          presente_id: string
          quantidade_cotas?: number | null
          reserva_resultante_id?: string | null
          slug_fatura_provedor?: string | null
          status_pagamento?: string
          telefone_presenteador?: string | null
          tipo: string
          ultima_resposta_provedor?: Json | null
          updated_at?: string
          url_checkout_provedor?: string | null
          valor_centavos: number
        }
        Update: {
          casamento_id?: string
          confirmado_em?: string | null
          contribuicao_resultante_id?: string | null
          convite_id?: string | null
          created_at?: string
          id?: string
          mensagem_convidado?: string | null
          motivo_falha?: string | null
          nome_presenteador?: string
          nsu_pedido_provedor?: string
          nsu_transacao_provedor?: string | null
          presente_id?: string
          quantidade_cotas?: number | null
          reserva_resultante_id?: string | null
          slug_fatura_provedor?: string | null
          status_pagamento?: string
          telefone_presenteador?: string | null
          tipo?: string
          ultima_resposta_provedor?: Json | null
          updated_at?: string
          url_checkout_provedor?: string | null
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "gift_payments_gift_id_fkey"
            columns: ["presente_id"]
            isOneToOne: false
            referencedRelation: "presentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_payments_invite_id_fkey"
            columns: ["convite_id"]
            isOneToOne: false
            referencedRelation: "convites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_payments_resulting_contribution_id_fkey"
            columns: ["contribuicao_resultante_id"]
            isOneToOne: false
            referencedRelation: "contribuicoes_presentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_payments_resulting_reservation_id_fkey"
            columns: ["reserva_resultante_id"]
            isOneToOne: false
            referencedRelation: "reservas_presentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_payments_wedding_id_fkey"
            columns: ["casamento_id"]
            isOneToOne: false
            referencedRelation: "casamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      planos: {
        Row: {
          created_at: string
          id: string
          limite_storage_mb: number | null
          max_casamentos: number | null
          max_convidados: number | null
          max_presentes: number | null
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          limite_storage_mb?: number | null
          max_casamentos?: number | null
          max_convidados?: number | null
          max_presentes?: number | null
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          limite_storage_mb?: number | null
          max_casamentos?: number | null
          max_convidados?: number | null
          max_presentes?: number | null
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      presentes: {
        Row: {
          casamento_id: string
          categoria_id: string | null
          created_at: string
          descricao: string | null
          e_presente_cota: boolean
          esta_ativo: boolean
          estilo_exibicao: string
          excluido_em: string | null
          icone_emocional: string | null
          id: string
          preco_centavos: number | null
          quantidade_disponivel: number | null
          titulo: string
          updated_at: string
          url_imagem: string | null
          valor_cota_centavos: number | null
          valor_meta_centavos: number | null
        }
        Insert: {
          casamento_id: string
          categoria_id?: string | null
          created_at?: string
          descricao?: string | null
          e_presente_cota?: boolean
          esta_ativo?: boolean
          estilo_exibicao?: string
          excluido_em?: string | null
          icone_emocional?: string | null
          id?: string
          preco_centavos?: number | null
          quantidade_disponivel?: number | null
          titulo: string
          updated_at?: string
          url_imagem?: string | null
          valor_cota_centavos?: number | null
          valor_meta_centavos?: number | null
        }
        Update: {
          casamento_id?: string
          categoria_id?: string | null
          created_at?: string
          descricao?: string | null
          e_presente_cota?: boolean
          esta_ativo?: boolean
          estilo_exibicao?: string
          excluido_em?: string | null
          icone_emocional?: string | null
          id?: string
          preco_centavos?: number | null
          quantidade_disponivel?: number | null
          titulo?: string
          updated_at?: string
          url_imagem?: string | null
          valor_cota_centavos?: number | null
          valor_meta_centavos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gifts_category_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_presentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gifts_wedding_id_fkey"
            columns: ["casamento_id"]
            isOneToOne: false
            referencedRelation: "casamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      reservas_presentes: {
        Row: {
          casamento_id: string
          convidado_id: string | null
          convite_id: string | null
          created_at: string
          id: string
          mensagem: string | null
          nome_contribuinte: string | null
          presente_id: string
          reservado_em: string
          telefone_presenteador: string | null
          updated_at: string
        }
        Insert: {
          casamento_id: string
          convidado_id?: string | null
          convite_id?: string | null
          created_at?: string
          id?: string
          mensagem?: string | null
          nome_contribuinte?: string | null
          presente_id: string
          reservado_em?: string
          telefone_presenteador?: string | null
          updated_at?: string
        }
        Update: {
          casamento_id?: string
          convidado_id?: string | null
          convite_id?: string | null
          created_at?: string
          id?: string
          mensagem?: string | null
          nome_contribuinte?: string | null
          presente_id?: string
          reservado_em?: string
          telefone_presenteador?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_reservations_gift_id_fkey"
            columns: ["presente_id"]
            isOneToOne: false
            referencedRelation: "presentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_reservations_group_id_fkey"
            columns: ["convite_id"]
            isOneToOne: false
            referencedRelation: "convites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_reservations_guest_id_fkey"
            columns: ["convidado_id"]
            isOneToOne: false
            referencedRelation: "convidados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_reservations_wedding_id_fkey"
            columns: ["casamento_id"]
            isOneToOne: false
            referencedRelation: "casamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      respostas_rsvp: {
        Row: {
          casamento_id: string
          convidado_id: string
          convite_id: string
          created_at: string
          id: string
          respondido_em: string | null
          status_rsvp: string
          updated_at: string
        }
        Insert: {
          casamento_id: string
          convidado_id: string
          convite_id: string
          created_at?: string
          id?: string
          respondido_em?: string | null
          status_rsvp?: string
          updated_at?: string
        }
        Update: {
          casamento_id?: string
          convidado_id?: string
          convite_id?: string
          created_at?: string
          id?: string
          respondido_em?: string | null
          status_rsvp?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rsvp_responses_guest_id_fkey"
            columns: ["convidado_id"]
            isOneToOne: false
            referencedRelation: "convidados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvp_responses_invite_id_fkey"
            columns: ["convite_id"]
            isOneToOne: false
            referencedRelation: "convites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvp_responses_wedding_id_fkey"
            columns: ["casamento_id"]
            isOneToOne: false
            referencedRelation: "casamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas: {
        Row: {
          casamento_id: string | null
          created_at: string
          dados: Json
          executar_em: string
          id: string
          status_tarefa: string
          tentativas: number
          tipo: string
          ultimo_erro: string | null
          updated_at: string
        }
        Insert: {
          casamento_id?: string | null
          created_at?: string
          dados?: Json
          executar_em?: string
          id?: string
          status_tarefa?: string
          tentativas?: number
          tipo: string
          ultimo_erro?: string | null
          updated_at?: string
        }
        Update: {
          casamento_id?: string | null
          created_at?: string
          dados?: Json
          executar_em?: string
          id?: string
          status_tarefa?: string
          tentativas?: number
          tipo?: string
          ultimo_erro?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_wedding_id_fkey"
            columns: ["casamento_id"]
            isOneToOne: false
            referencedRelation: "casamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      trilha_auditoria: {
        Row: {
          acao: string
          autor_id: string | null
          casamento_id: string
          created_at: string
          entidade_id: string | null
          id: string
          metadados: Json
          tipo_autor: string
          tipo_entidade: string
        }
        Insert: {
          acao: string
          autor_id?: string | null
          casamento_id: string
          created_at?: string
          entidade_id?: string | null
          id?: string
          metadados?: Json
          tipo_autor: string
          tipo_entidade: string
        }
        Update: {
          acao?: string
          autor_id?: string | null
          casamento_id?: string
          created_at?: string
          entidade_id?: string | null
          id?: string
          metadados?: Json
          tipo_autor?: string
          tipo_entidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "membros_casamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_wedding_id_fkey"
            columns: ["casamento_id"]
            isOneToOne: false
            referencedRelation: "casamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      vinculos_convite_etiqueta: {
        Row: {
          convite_id: string
          created_at: string
          etiqueta_id: string
        }
        Insert: {
          convite_id: string
          created_at?: string
          etiqueta_id: string
        }
        Update: {
          convite_id?: string
          created_at?: string
          etiqueta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_tag_links_invite_id_fkey"
            columns: ["convite_id"]
            isOneToOne: false
            referencedRelation: "convites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_tag_links_tag_id_fkey"
            columns: ["etiqueta_id"]
            isOneToOne: false
            referencedRelation: "etiquetas_convite"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      convidados_com_status: {
        Row: {
          apelido: string | null
          caminho_foto: string | null
          casamento_id: string | null
          convite_id: string | null
          created_at: string | null
          data_nascimento: string | null
          email: string | null
          excluido_em: string | null
          faixa_etaria_manual: string | null
          grupo_id: string | null
          id: string | null
          nome_completo: string | null
          nucleo_id: string | null
          observacoes: string | null
          ordem_nucleo: number | null
          papel_casamento: string | null
          respondido_em: string | null
          restricoes_alimentares: string | null
          sexo: string | null
          status_rsvp: string | null
          telefone: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guests_group_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_invite_id_fkey"
            columns: ["convite_id"]
            isOneToOne: false
            referencedRelation: "convites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_invite_id_fkey"
            columns: ["convite_id"]
            isOneToOne: false
            referencedRelation: "convites_com_resumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_party_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "nucleos_acompanhantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_wedding_id_fkey"
            columns: ["casamento_id"]
            isOneToOne: false
            referencedRelation: "casamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      convites_com_resumo: {
        Row: {
          arquivado_em: string | null
          casamento_id: string | null
          codigo_interno: string | null
          convidado_responsavel_id: string | null
          created_at: string | null
          enviado_em: string | null
          excluido_em: string | null
          id: string | null
          max_acompanhantes: number | null
          mensagem_rsvp: string | null
          mensagem_rsvp_em: string | null
          nome: string | null
          observacoes: string | null
          status_convite: string | null
          status_resposta: string | null
          total_membros: number | null
          total_respondidos: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_groups_wedding_id_fkey"
            columns: ["casamento_id"]
            isOneToOne: false
            referencedRelation: "casamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_responsible_guest_id_fkey"
            columns: ["convidado_responsavel_id"]
            isOneToOne: false
            referencedRelation: "convidados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_responsible_guest_id_fkey"
            columns: ["convidado_responsavel_id"]
            isOneToOne: false
            referencedRelation: "convidados_com_status"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      buscar_convidados_por_nome: {
        Args: { p_busca: string; p_casamento_id: string; p_limite?: number }
        Returns: {
          apelido: string
          id: string
          nome_completo: string
        }[]
      }
      cancelar_reserva_presente: {
        Args: {
          p_convidado_id?: string
          p_convite_id?: string
          p_ignorar_checagem_posse?: boolean
          p_reserva_id: string
        }
        Returns: undefined
      }
      confirmar_pagamento_presente: {
        Args: { p_pagamento_id: string }
        Returns: {
          casamento_id: string
          confirmado_em: string | null
          contribuicao_resultante_id: string | null
          convite_id: string | null
          created_at: string
          id: string
          mensagem_convidado: string | null
          motivo_falha: string | null
          nome_presenteador: string
          nsu_pedido_provedor: string
          nsu_transacao_provedor: string | null
          presente_id: string
          quantidade_cotas: number | null
          reserva_resultante_id: string | null
          slug_fatura_provedor: string | null
          status_pagamento: string
          telefone_presenteador: string | null
          tipo: string
          ultima_resposta_provedor: Json | null
          updated_at: string
          url_checkout_provedor: string | null
          valor_centavos: number
        }
        SetofOptions: {
          from: "*"
          to: "pagamentos_presentes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      convidado_nome_corresponde: {
        Args: { p_apelido: string; p_busca: string; p_nome_completo: string }
        Returns: boolean
      }
      finalizar_rsvp_convite: {
        Args: {
          p_acompanhantes?: Json
          p_casamento_id: string
          p_convite_id: string
          p_mensagem?: string
          p_origem?: string
        }
        Returns: {
          arquivado_em: string | null
          casamento_id: string
          codigo_interno: string
          convidado_responsavel_id: string | null
          created_at: string
          enviado_em: string | null
          excluido_em: string | null
          id: string
          max_acompanhantes: number | null
          mensagem_rsvp: string | null
          mensagem_rsvp_em: string | null
          nome: string
          observacoes: string | null
          status_convite: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "convites"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_dono_casamento: { Args: { p_wedding_id: string }; Returns: boolean }
      is_membro_casamento: { Args: { p_wedding_id: string }; Returns: boolean }
      is_slug_reservado: { Args: { p_slug: string }; Returns: boolean }
      reservar_presente: {
        Args: {
          p_convidado_id?: string
          p_convite_id?: string
          p_mensagem?: string
          p_nome_contribuinte?: string
          p_presente_id: string
          p_telefone_presenteador?: string
        }
        Returns: {
          casamento_id: string
          convidado_id: string | null
          convite_id: string | null
          created_at: string
          id: string
          mensagem: string | null
          nome_contribuinte: string | null
          presente_id: string
          reservado_em: string
          telefone_presenteador: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "reservas_presentes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      salvar_rsvp_convidado: {
        Args: {
          p_casamento_id: string
          p_convidado_id: string
          p_ip?: string
          p_origem?: string
          p_restricoes_alimentares?: string
          p_status: string
          p_user_agent?: string
        }
        Returns: {
          casamento_id: string
          convidado_id: string
          convite_id: string
          created_at: string
          id: string
          respondido_em: string | null
          status_rsvp: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "respostas_rsvp"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sincronizar_nucleo_convidado: {
        Args: {
          p_acompanhantes?: Json
          p_casamento_id: string
          p_convite?: Json
          p_ids_convidados_removidos?: string[]
          p_principal: Json
        }
        Returns: Json
      }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
