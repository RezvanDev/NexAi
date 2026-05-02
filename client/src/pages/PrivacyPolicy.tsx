import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-[#0a0a0e] text-foreground p-6 md:p-12">
            <div className="max-w-3xl mx-auto glass-panel p-8 md:p-12 rounded-3xl space-y-8">
                <Link href="/">
                    <button className="flex items-center gap-2 text-primary hover:text-accent transition-colors mb-8">
                        <ArrowLeft className="w-4 h-4" /> Вернуться назад
                    </button>
                </Link>

                <div className="space-y-6">
                    <h1 className="text-3xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                        Политика конфиденциальности
                    </h1>
                    <p className="text-sm text-muted-foreground">Последнее обновление: {new Date().toLocaleDateString()}</p>

                    <div className="space-y-4 text-white/80 leading-relaxed text-sm">
                        <h2 className="text-xl font-semibold text-white mt-8">1. Общие положения</h2>
                        <p>Настоящая Политика конфиденциальности определяет порядок обработки и защиты персональных данных пользователей сервиса (далее — "Пользователь"), использующих функционал ИИ-Ассистента.</p>

                        <h2 className="text-xl font-semibold text-white mt-8">2. Сбор персональных данных</h2>
                        <p>В рамках оказания услуг мы можем собирать следующие данные:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Имя пользователя;</li>
                            <li>Номер телефона;</li>
                            <li>Аудиозапись разговора с ИИ-Ассистентом;</li>
                            <li>Текстовая расшифровка (транскрипт) разговора;</li>
                            <li>Технические данные (IP-адрес, тип браузера, время доступа).</li>
                        </ul>

                        <h2 className="text-xl font-semibold text-white mt-8">3. Цели обработки данных</h2>
                        <p>Собранные данные используются исключительно для:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Обеспечения работы ИИ-Ассистента и генерации ответов в реальном времени;</li>
                            <li>Предоставления владельцу бизнеса (нашему Клиенту) истории и сводки по разговору;</li>
                            <li>Связи с Пользователем по итогам разговора;</li>
                            <li>Улучшения качества обслуживания.</li>
                        </ul>

                        <h2 className="text-xl font-semibold text-white mt-8">4. Передача данных третьим лицам</h2>
                        <p>
                            Для генерации и обработки речи мы используем технологии искусственного интеллекта сторонних провайдеров (например, OpenAI).
                            Данные передаются по защищенным каналам связи исключительно с целью обработки запроса. Мы не продаем персональные данные третьим лицам.
                        </p>

                        <h2 className="text-xl font-semibold text-white mt-8">5. Хранение и защита данных</h2>
                        <p>
                            Мы принимаем все необходимые организационные и технические меры для защиты персональных данных от неправомерного доступа, изменения, раскрытия или уничтожения.
                        </p>

                        <h2 className="text-xl font-semibold text-white mt-8">6. Согласие пользователя</h2>
                        <p>
                            Используя виджет ИИ-Ассистента и нажимая кнопку "Начать Звонок", Пользователь выражает свое безоговорочное согласие с условиями настоящей Политики конфиденциальности и дает согласие на обработку, хранение и использование своих персональных данных, включая запись голоса.
                        </p>

                        <h2 className="text-xl font-semibold text-white mt-8">7. Контакты</h2>
                        <p>
                            Если у вас возникли вопросы по поводу обработки ваших данных, вы можете обратиться к представителю компании, на сайте которой размещен данный виджет.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
