-- PostgREST-тің схема кэші кейбір бұрынғы ALTER TABLE миграцияларынан
-- кейін жаңармаған сияқты (мыс. orders.passenger_reviewed, orders.driver_paid
-- бағандары базада бар, бірақ REST API "could not find column" деп қате
-- беретін). Кэшті қолмен қайта жүктеу үшін.
notify pgrst, 'reload schema';
