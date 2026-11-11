// Кейс NeuroFlex: сайт студии AI-стартапов. Экраны — целые фреймы из Figma (страница «Нейрофлекс»), тексты — по
// слайдам презентации кейса (на Behance они лежат внутри картинок).
import type { CaseStudy } from './types';
import colors from '../../assets/projects/neuroflex/colors.webp';
import landingMobile from '../../assets/projects/neuroflex/landing-mobile.webp';
import landing from '../../assets/projects/neuroflex/landing.webp';
import mCompetence from '../../assets/projects/neuroflex/m-competence.webp';
import mContact from '../../assets/projects/neuroflex/m-contact.webp';
import mProjects from '../../assets/projects/neuroflex/m-projects.webp';
import projects from '../../assets/projects/neuroflex/projects.webp';
import typography from '../../assets/projects/neuroflex/typography.webp';

export const neuroflex: CaseStudy = {
  facts: [
    { label: 'Продукт', value: 'Сайт студии, запускающей AI-стартапы' },
    { label: 'Роль', value: 'UX/UI-дизайн лендинга' },
    { label: 'Команда', value: 'Вёрстка — Арслан Боваев, CEO — Вадим Волощук' },
    { label: 'Год', value: '2025' },
  ],
  sections: [
    {
      title: 'О проекте',
      text: [
        'NeuroFlex — студия, запускающая AI-стартапы нового поколения: исследовательская точность, инженерная дисциплина и предпринимательский инстинкт. Миссия — не выпускать «очередные ML-приложения», а строить компании, которые меняют свои ниши.',
        'Сайт должен коротко объяснить, что делает студия, как идея превращается в продукт, и привести к разговору о проекте.',
      ],
    },
    {
      title: 'Лендинг',
      text: [
        'Порядок блоков повторяет путь клиента: кто мы, как превращаем идею в AI-продукт (шкала этапов от гипотезы до выхода на рынок), какие компетенции закрываем, какие продукты уже запустили — и в конце приглашение обсудить проект.',
      ],
      media: [{ layout: 'page', images: [{ src: landing, alt: 'Лендинг NeuroFlex целиком, десктоп', caption: 'Десктоп' }] }],
    },
    {
      title: 'Проекты студии',
      text: ['Кейсы показаны как реальные продукты: экран, короткое описание и кнопка «Подробнее». Посетитель видит результат работы, а не обещания.'],
      media: [{ layout: 'wide', images: [{ src: projects, scale: 2, alt: 'Блок «Реальные AI-продукты, созданные NeuroFlex» с карточками проектов', caption: 'Проекты' }] }],
    },
    {
      title: 'Визуальный язык',
      text: [
        'Палитра строится вокруг технологической глубины: почти чёрный фон, чистый белый и фиолетовый NeuroCore Violet как акцент — он управляет фокусом и задаёт ритм. Шрифт — Montserrat: проверенная классика, читаемая и нейтральная, одинаково работает в интерфейсе, на лендинге и в презентациях.',
      ],
      media: [
        {
          layout: 'pair',
          images: [
            { src: colors, scale: 2, alt: 'Цветовая система: NeuroCore Violet, Deep Carbon Black, Pure White, Quantum Lilac', caption: 'Цвета' },
            { src: typography, scale: 2, alt: 'Типографика: Montserrat, начертания Regular, Medium, SemiBold', caption: 'Типографика' },
          ],
        },
      ],
    },
    {
      title: 'Мобильная версия',
      text: ['На телефоне блоки идут в том же порядке, компетенции становятся карточками, а у каждого блока есть номер — легко понять, где ты на длинной странице.'],
      media: [
        {
          layout: 'phones',
          images: [
            { src: landingMobile, alt: 'Лендинг на телефоне целиком', caption: 'Лендинг' },
            { src: mCompetence, alt: 'Компетенции на телефоне', caption: 'Компетенции' },
            { src: mProjects, alt: 'Проекты на телефоне', caption: 'Проекты' },
            { src: mContact, alt: 'Контакты на телефоне', caption: 'Контакты' },
          ],
        },
      ],
    },
  ],
};
