// Загрузка данных через await
async function getDataAsync(url) {
    // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        redirect: 'follow',
    });

    // При сетевой ошибке (мы оффлайн) из `fetch` вылетит эксцепшн.
    // Тут мы даём ему просто вылететь из функции дальше наверх.
    // Если же его нужно обработать, придётся обернуть в `try` и сам `fetch`:
    //
    // try {
    //     response = await fetch(url, {...});
    // } catch (error) {
    //     // Что-то делаем
    //     throw error;
    // }

    // Если мы тут, значит, запрос выполнился.
    // Но там может быть 404, 500, и т.д., поэтому проверяем ответ.
    if (response.ok) {
        return response.json();
    }

    // Пример кастомной ошибки (если нужно проставить какие-то поля
    // для внешнего кода). Можно выкинуть и сам `response`, смотря
    // какой у вас контракт. Главное перевести код в ветку `catch`.
    const error = {
        status: response.status,
        customError: 'wtfAsync',
    };
    throw error;
}

// Две функции просто для примера, выберите с await или promise, какая нравится
const getData = getDataAsync;

async function loadCountriesData() {
    let countries = [];
    try {
        // ПРОВЕРКА ОШИБКИ №1: ломаем этот урл, заменяя all на allolo,
        // получаем кастомную ошибку.
        countries = await getData('https://restcountries.com/v3.1/all?fields=name&fields=cca3&fields=area');
    } catch (error) {
        // console.log('catch for getData');
        // console.error(error);
        throw error;
    }
    return countries.reduce((result, country) => {
        result[country.cca3] = country;
        return result;
    }, {});
}

const form = document.getElementById('form');
const fromCountry = document.getElementById('fromCountry');
const toCountry = document.getElementById('toCountry');
const countriesList = document.getElementById('countriesList');
const submit = document.getElementById('submit');
const output = document.getElementById('output');

(async () => {
    fromCountry.disabled = true;
    toCountry.disabled = true;
    submit.disabled = true;

    output.textContent = 'Loading…';
    let countriesData = {};
    try {
        // ПРОВЕРКА ОШИБКИ №2: Ставим тут брейкпоинт и, когда дойдёт
        // до него, переходим в оффлайн-режим. Получаем эксцепшн из `fetch`.
        countriesData = await loadCountriesData();
    } catch (error) {
        // console.log('catch for loadCountriesData');
        // console.error(error);
        output.textContent = 'Something went wrong. Try to reset your compluter.';
        return;
    }
    output.textContent = '';

    // Заполняем список стран для подсказки в инпутах
    Object.keys(countriesData)
        .sort((a, b) => countriesData[b].area - countriesData[a].area)
        .forEach((code) => {
            const option = document.createElement('option');
            option.value = countriesData[code].name.common;
            countriesList.appendChild(option);
        });

    fromCountry.disabled = false;
    toCountry.disabled = false;
    submit.disabled = false;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!fromCountry.value || !toCountry.value) {
            return;
        }
        output.textContent = `Calculating a route from ${fromCountry.value} to ${toCountry.value}...`;
        const countries = Object.entries(countriesData); // [['RUS', {...}], [], []]
        const cca3CountryFrom = countries.find((c) => c[1].name.common === fromCountry.value)[0];
        const cca3CountryTo = countries.find((c) => c[1].name.common === toCountry.value)[0];

        const visitedFrom = { [cca3CountryFrom]: null };
        const queue = [cca3CountryFrom];
        let i = 0;

        while (i < queue.length) {
            const countryCode = queue[i];
            i += 1;
            // eslint-disable-next-line no-await-in-loop
            const countryData = await getData(
                `https://restcountries.com/v3.1/alpha/${countryCode}?fields=name&fields=borders`
            );
            if (countryData.borders.includes(cca3CountryTo)) {
                visitedFrom[cca3CountryTo] = countryCode;
                break;
            }
            for (const borderCountry of countryData.borders) {
                if (!(borderCountry in visitedFrom)) {
                    visitedFrom[borderCountry] = countryCode;
                    queue.push(borderCountry);
                }
            }
        }
        if (!visitedFrom[cca3CountryTo]) {
            output.textContent = `There is no route from ${fromCountry.value} to ${toCountry.value}. Requests: ${i}`;
        } else {
            console.log(visitedFrom);
            const route = [];
            let currentCountry = cca3CountryTo;
            while (currentCountry) {
                route.push(currentCountry);
                currentCountry = visitedFrom[currentCountry];
            }
            route.reverse();
            const routeCountryNames = route.map((code) => countriesData[code].name.common);
            output.textContent = `The route may be: ${routeCountryNames.join(', ')}. Requests: ${i}`;
        }
        // TODO: Вывести, откуда и куда едем, и что идёт расчёт.
        // TODO: Рассчитать маршрут из одной страны в другую за минимум запросов.
        // TODO: Вывести маршрут и общее количество запросов.
    });
})();
