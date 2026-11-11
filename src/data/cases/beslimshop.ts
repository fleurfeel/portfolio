// Кейс BeSlimShop: интернет-магазин профессиональной косметики. Дизайн-экраны — целые фреймы из Figma
// (страница BeSlimShop; секции с референсами брендов не берём), страницы живого сайта — снимки beslimshop.ru целиком.
// Фреймы, где на холсте Figma видны тёмные поля между версиями, не берём — вместо них страницы живого сайта.
import type { CaseStudy } from './types';
import catalogMobile from '../../assets/projects/beslimshop/catalog-mobile.webp';
import catalog from '../../assets/projects/beslimshop/catalog.webp';
import colors from '../../assets/projects/beslimshop/colors.webp';
import consult from '../../assets/projects/beslimshop/consult.webp';
import deliveryPage from '../../assets/projects/beslimshop/delivery-page.webp';
import heroDraft from '../../assets/projects/beslimshop/hero-draft.webp';
import hero from '../../assets/projects/beslimshop/hero.webp';
import homeMobile from '../../assets/projects/beslimshop/home-mobile.webp';
import home from '../../assets/projects/beslimshop/home.webp';
import productMobile from '../../assets/projects/beslimshop/product-mobile.webp';
import product from '../../assets/projects/beslimshop/product.webp';
import trustAlt from '../../assets/projects/beslimshop/trust-alt.webp';
import trust from '../../assets/projects/beslimshop/trust.webp';
import typography from '../../assets/projects/beslimshop/typography.webp';

export const beslimshop: CaseStudy = {
  facts: [
    { label: 'Продукт', value: 'Интернет-магазин профессиональной косметики' },
    { label: 'Роль', value: 'Дизайнер сайта' },
    { label: 'Платформы', value: 'Десктоп и телефон' },
    { label: 'Сайт', value: 'beslimshop.ru — работает' },
  ],
  sections: [
    {
      title: 'Задача',
      text: [
        'BeSlimShop — официальный магазин профессиональной косметики: DMK, Dr. Christine Schrammek, Levissime, Thalac и другие бренды, которые обычно продают через косметологов. Покупатель такой косметики боится двух вещей: подделки и того, что средство не подойдёт его коже.',
        'Поэтому сайт должен с первого экрана говорить об оригинальности и при этом помогать выбрать: не заставлять человека разбираться в сотнях баночек, а вести его от задачи кожи к средству.',
      ],
    },
    {
      title: 'Первый экран',
      text: [
        'Первая версия была пустой: заголовок и кнопка на белом. Её сменила постановочная сцена — флаконы на камнях и мху среди лаванды и роз. Она сразу задаёт тон «уход и забота», а в кадре — реальные средства из каталога, а не абстрактная картинка.',
      ],
      media: [
        {
          layout: 'pair',
          images: [
            { src: heroDraft, alt: 'Первая версия первого экрана: заголовок и кнопка на белом фоне', caption: 'Первая версия' },
            { src: hero, alt: 'Финальный первый экран: средства на камнях среди лаванды и роз, заголовок «Уход за собой начинается здесь»', caption: 'Финал' },
          ],
        },
      ],
    },
    {
      title: 'Подбор ухода',
      text: [
        'Сразу под первым экраном — три входа в каталог по задаче, а не по бренду: потребности кожи, этапы ухода и типы кожи. Те же группы работают фильтрами в каталоге и подписаны в каждой карточке товара, поэтому человек везде ориентируется по одной логике.',
        'Тем, кто не знает свой тип кожи, сайт предлагает живую помощь: оставить заявку, и косметолог подберёт уход. Входы по задаче видны на главной в разделе «Сайт целиком».',
      ],
      media: [
        {
          layout: 'wide',
          images: [{ src: consult, alt: 'Блок «Определим тип кожи и подберём уход» с кнопкой «Оставить заявку»', caption: 'Подбор с косметологом' }],
        },
      ],
    },
    {
      title: 'Доверие',
      text: [
        'Главный страх покупателя — подделка, поэтому оригинальность вынесена в отдельный баннер посреди главной. Я сравнивал две формулировки: «Покупайте с уверенностью» и «Без сомнений. Без подделок.» Во второй страх назван прямо и снят одной фразой — она и осталась на сайте.',
      ],
      media: [
        {
          layout: 'pair',
          images: [
            { src: trustAlt, alt: 'Баннер «Покупайте с уверенностью»', caption: 'Вариант' },
            { src: trust, alt: 'Баннер «Без сомнений. Без подделок.» — официальный дистрибьютор ведущих брендов', caption: 'Финал' },
          ],
        },
      ],
    },
    {
      title: 'Каталог и товар',
      text: [
        'В каталоге фильтры по бренду, потребностям кожи, типу кожи и этапам ухода, а бестселлеры вынесены в отдельную вкладку. В карточке товара — описание, способ применения, объём, бренд и страна, а внизу метки: для какой проблемы, какого типа кожи и какого этапа ухода это средство.',
      ],
      media: [
        {
          layout: 'page',
          images: [{ src: catalog, alt: 'Каталог на живом сайте: фильтры и сетка товаров', caption: 'Каталог' }],
        },
        {
          layout: 'wide',
          images: [{ src: product, alt: 'Карточка товара на живом сайте: фото, цена, описание, применение и метки по типу кожи', caption: 'Карточка товара' }],
        },
      ],
    },
    {
      title: 'Доставка и оплата',
      text: [
        'Вопросы о доставке и оплате закрыты на одной странице: по городу курьером, по России через СДЭК или бесплатный самовывоз из салона; карты, СБП и оплата частями без процентов через «Долями». Каждый способ — отдельная карточка с иконкой и коротким объяснением.',
      ],
      media: [
        {
          layout: 'wide',
          images: [{ src: deliveryPage, alt: 'Страница «Доставка и оплата» на живом сайте: способы доставки и оплаты карточками', caption: 'Доставка и оплата' }],
        },
      ],
    },
    {
      title: 'Визуальный язык',
      text: [
        'Один спокойный лавандовый акцент и белый: цвет перекликается с лавандой на фото и не спорит с упаковками брендов. Raleway — для заголовков, Geist — для текста.',
      ],
      media: [
        {
          layout: 'pair',
          images: [
            { src: typography, alt: 'Типографика: Raleway для заголовков, Geist для текста', caption: 'Типографика' },
            { src: colors, alt: 'Цвета: лавандовый акцент и белый', caption: 'Цвета' },
          ],
        },
      ],
    },
    {
      title: 'Сайт целиком',
      text: ['Главная страница живого сайта и мобильная версия. Мобильные экраны листаются прямо в рамке, а по нажатию открываются целиком.'],
      media: [
        {
          layout: 'page',
          images: [{ src: home, alt: 'Главная страница beslimshop.ru целиком', caption: 'Главная' }],
        },
        {
          layout: 'phones',
          images: [
            { src: homeMobile, scale: 2, alt: 'Главная на телефоне', caption: 'Главная' },
            { src: catalogMobile, scale: 2, alt: 'Каталог на телефоне', caption: 'Каталог' },
            { src: productMobile, scale: 2, alt: 'Карточка товара на телефоне', caption: 'Товар' },
          ],
        },
      ],
    },
  ],
};
