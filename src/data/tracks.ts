import { TrackData } from '../types';
import image0 from '../assets/images/tame_impala_cover_building_1793799892877.jpg';
import image1 from '../assets/images/tame_impala_person_sky_1793799892976.jpg';
import image2 from '../assets/images/human_cinema_rain_window_1793797953624.jpg';
import image3 from '../assets/images/human_cinema_ocean_walk_1793797954057.jpg';
import image4 from '../assets/images/human_cinema_rooftop_dusk_1793797953806.jpg';
import image5 from '../assets/images/human_cinema_hands_record_1793797954580.jpg';

export const TRACK_CATALOG: TrackData[] = [
  {
    id: 'track-00',
    title: 'The Less I Know The Better',
    artist: 'Tame Impala',
    album: 'Currents',
    year: '2015',
    durationMs: 216000, // 3:36 (exact match to user mockup)
    bpm: 117,
    key: 'F# minor',
    mood: 'Psychedelic Pop · Indie Disco · Nostalgia',
    accentColor: '#002aff', // Electric cobalt blue
    secondaryColor: '#ffffff',
    coverImage: 'image0',
    discArtwork: '/assets/aistudio/image_681cb620.png',
    chapters: [
      {
        id: 'c01',
        title: '01. Someone Said They Left Together',
        startMs: 0,
        endMs: 58000,
        emotion: 'Vulnerabilidade & Suspeita',
        theme: 'Início do rumor na festa',
        visualBrief: 'Silhueta de concreto brutalista contra nuvens de grão 35mm'
      },
      {
        id: 'c02',
        title: '02. I Was Doing Fine Without You',
        startMs: 58000,
        endMs: 125000,
        emotion: 'Conflito Interno',
        theme: 'Refrão catártico e linha de baixo pulsante',
        visualBrief: 'Retícula dithered em azul cobalto, estrela de 4 pontas e transientes'
      },
      {
        id: 'c03',
        title: '03. Don\'t Make Me Wait Forever',
        startMs: 125000,
        endMs: 178000,
        emotion: 'Desespero Contido',
        theme: 'Ponte melancólica com sintetizadores analógicos',
        visualBrief: 'Plano médio contemplativo, céu tempestuoso e silhueta humana'
      },
      {
        id: 'c04',
        title: '04. Goodbye / Outro',
        startMs: 178000,
        endMs: 216000,
        emotion: 'Resignação Elegante',
        theme: 'Desvanecimento sutil do eco',
        visualBrief: 'Fade óptico suave, retícula estocástica e silêncio final'
      }
    ],
    lyrics: [
      { id: 't1', startMs: 1000, endMs: 8000, text: 'Someone said they left together', subtext: 'Alguém disse que eles saíram juntos' },
      { id: 't2', startMs: 8500, endMs: 16000, text: 'I ran out the door to get her', subtext: 'Corri até a porta para alcançá-la' },
      { id: 't3', startMs: 16500, endMs: 24000, text: 'She was holding hands with Trevor', subtext: 'Ela estava de mãos dadas com Trevor', emphasis: true },
      { id: 't4', startMs: 24500, endMs: 33000, text: 'Not the greatest feeling ever', subtext: 'Não é exatamente a melhor sensação do mundo' },
      { id: 't5', startMs: 34000, endMs: 44000, text: 'Said, "Pull yourself together', subtext: 'Disse a mim mesmo: "Recomponha-se' },
      { id: 't6', startMs: 44500, endMs: 57000, text: 'You should try your luck with Heather"', subtext: 'Você deveria tentar a sorte com Heather"', emphasis: true },
      { id: 't7', startMs: 58000, endMs: 72000, text: 'Oh my love, can\'t you see yourself by my side?', subtext: 'Meu amor, você não consegue se imaginar ao meu lado?' },
      { id: 't8', startMs: 73000, endMs: 88000, text: 'No surprise when you\'re on his shoulder like every night', subtext: 'Sem surpresa quando você descansa no ombro dele toda noite', emphasis: true },
      { id: 't9', startMs: 89000, endMs: 102000, text: 'Oh my love, can\'t you see that you\'re on my mind?', subtext: 'Meu amor, você não percebe que não sai da minha cabeça?' },
      { id: 't10', startMs: 102500, endMs: 124000, text: 'Don\'t suppose we could convince your lover to change his mind', subtext: 'Acho difícil convencer seu amante a mudar de ideia', emphasis: true },
      { id: 't11', startMs: 125000, endMs: 140000, text: 'So goodbye...', subtext: 'Então adeus...' },
      { id: 't12', startMs: 141000, endMs: 156000, text: 'She was holding hands with Trevor', subtext: 'Ela estava de mãos dadas com Trevor' },
      { id: 't13', startMs: 157000, endMs: 177000, text: 'The less I know the better', subtext: 'Quanto menos eu souber, melhor', emphasis: true },
      { id: 't14', startMs: 178000, endMs: 198000, text: 'Don\'t make me wait forever', subtext: 'Não me faça esperar para sempre' },
      { id: 't15', startMs: 199000, endMs: 216000, text: 'SELVA // REPRODUÇÃO ENCERRADA', subtext: 'Registro auditivo finalizado' }
    ],
    scenes: [
      {
        id: 's01',
        title: 'Building Against Sky',
        image: 'image0',
        secondaryImage: '/assets/aistudio/image_681cb620.png',
        tag: '35mm · Tri-X',
        layout: 'split',
        speed: 'normal',
        aspectRatio: '1:1',
        caption: 'Building rooftop silhouette against cloudy overcast sky'
      },
      {
        id: 's02',
        title: 'Person Looking Up at Clouds',
        image: 'image1',
        secondaryImage: '/assets/aistudio/image_681cb620.png',
        tag: 'Cinematic · Cobalt Star',
        layout: 'single',
        speed: 'slow',
        aspectRatio: '16:9',
        caption: 'Contemplative silhouette with blue star flare'
      }
    ]
  },
  {
    id: 'track-01',
    title: 'NOTURNO EM SÃO PAULO',
    artist: 'Arthur Linhares',
    album: 'Cidades Invisíveis',
    year: '2026',
    durationMs: 174000,
    bpm: 88,
    key: 'D menor',
    mood: 'Melancolia Urbana · Cinema Noir',
    accentColor: '#002aff',
    secondaryColor: '#f44336',
    coverImage: 'image2',
    discArtwork: '/assets/aistudio/image_b4da673e.png',
    chapters: [
      {
        id: 'c1',
        title: 'Cap. I — Vidro Embaçado e Café Frio',
        startMs: 0,
        endMs: 38000,
        emotion: 'Quietude & Espera',
        theme: 'Solidão na metrópole chuvosa',
        visualBrief: 'Reflexos de neon no vidro, profundidade de campo rasa'
      },
      {
        id: 'c2',
        title: 'Cap. II — O Farol das Cinco da Manhã',
        startMs: 38000,
        endMs: 86000,
        emotion: 'Aceleração Sutil',
        theme: 'Caminho de volta para casa',
        visualBrief: 'Asfalto molhado, corte seco em luz de freio'
      },
      {
        id: 'c3',
        title: 'Cap. III — Conversas que Não Tiveram Fim',
        startMs: 86000,
        endMs: 132000,
        emotion: 'Afeto & Nostalgia',
        theme: 'Encontro efêmero no terraço',
        visualBrief: 'Dois rostos em contraplano, vento nos cabelos'
      },
      {
        id: 'c4',
        title: 'Cap. IV — O Primeiro Sol Entre os Prédios',
        startMs: 132000,
        endMs: 174000,
        emotion: 'Dissolução',
        theme: 'Clarear do dia e desfecho',
        visualBrief: 'Luz difusa, fade térmico'
      }
    ],
    lyrics: [
      { id: 'l1', startMs: 2000, endMs: 8000, text: 'A chuva escorre pela marquise da São Luís', subtext: 'Rain drips across the downtown awnings' },
      { id: 'l2', startMs: 8500, endMs: 14500, text: 'Você pediu um café que nunca esfriou na mesa', subtext: 'A cup of coffee left warm in the half-light' },
      { id: 'l3', startMs: 15000, endMs: 22000, text: 'Os faróis desenham rios vermelhos no concreto', subtext: 'Taillights carve crimson rivers in the concrete', emphasis: true },
      { id: 'l4', startMs: 23000, endMs: 31000, text: 'E o relógio do banco insiste em marcar zero horas', subtext: 'While the bank clock insists on midnight' }
    ],
    scenes: [
      {
        id: 's1',
        title: 'Café & Chuva',
        image: 'image2',
        secondaryImage: '/assets/aistudio/image_681cb620.png',
        tag: '35mm · Tungstênio',
        layout: 'single',
        speed: 'normal',
        aspectRatio: '16:9',
        caption: 'São Paulo, 04:18 AM — Câmera fixa em vidro molhado'
      }
    ]
  }
];
