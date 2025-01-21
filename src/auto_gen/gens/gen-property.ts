
export function logPropertyConstraints<T>(cls: new () => T): void {
    const instance = new cls();
    const keys = Object.keys(instance) as (keyof T)[];
    const propertyDecorators: Record<string, any[]> = {};

    keys.forEach((key) => {
        const property = key as string;

        const type = Reflect.getMetadata('type', instance, property);
        const isOptional = Reflect.getMetadata('optional', instance, property);

        const decorators = [];
        if (type !== undefined) decorators.push({ decorator: 'Type', value: type });
        if (isOptional) decorators.push({ decorator: 'Optional', value: true });

        propertyDecorators[property] = decorators;
    });

    const baseValues = { ...instance };
    console.log(baseValues)
    const testCases = generateTestCases(baseValues, propertyDecorators);

    console.log(JSON.stringify(testCases, null, 2));
}

function generateTestCases(baseValues: Record<string, any>, decorators: Record<string, any[]>): any[] {
    const keys = Object.keys(baseValues);

    const fieldVariants = keys.map((key) => {

        const fieldDecorators = decorators[key];

        return generateVariantsForField(baseValues[key], fieldDecorators).map((variant) => ({ [key]: variant }));
    });

    const combineTestcase = generateCombineTestcase(fieldVariants);

    return combineTestcase.map((combination) => {

        const testCase = combination.reduce((accumulatorValue, currentValue) => ({ ...accumulatorValue, ...currentValue }), {});

        return {
            testCase: testCase,
            expectedDetail: generateExpectedDetail(testCase)
        };
    });
}

function generateExpectedDetail(testCase: Record<string, any>): string[] {
    const details: string[] = [];
    const fieldValidators: Record<string, (value: any) => string[]> = {
        age: (value) => {
            const errors: string[] = [];
            if (typeof value === 'string') {
                errors.push('age should be a number');
            } else if (value < 0) {
                errors.push('age should not be negative');
            } else if (value === 0) {
                errors.push('age should be greater than 0');
            }
            return errors;
        },
        username: (value) => {
            const errors: string[] = [];
            if (value === null || value === undefined || value === '') {
                errors.push('username should not be null, undefined or empty');
            } else if (typeof value !== 'string') {
                errors.push('username should be a string');
            } else if (value.length < 1 || value.length > 255) {
                errors.push('username should have a length between 1 and 255');
            }
            return errors;
        },
        address: (value) => {
            const errors: string[] = [];
            if (value !== undefined && typeof value !== 'string') {
                errors.push('address should be a string');
            }
            return errors;
        },
        birthday: (value) => {
            const errors: string[] = [];
            if (value !== undefined && !(value instanceof Date)) {
                errors.push('birthday should be a valid date');
            }
            return errors;
        },
        isActive: (value) => {
            const errors: string[] = [];
            if (value !== undefined && typeof value !== 'boolean') {
                errors.push('isActive should be a boolean');
            }
            return errors;
        },
        typeAny: (value) => {
            const errors: string[] = [];
            return errors;
        },
        tags: (value) => {
            const errors: string[] = [];
            if (value !== undefined && !Array.isArray(value)) {
                errors.push('tags should be an array');
            }
            return errors;
        },
    };

    Object.entries(testCase).forEach(([key, value]) => {

        if (fieldValidators[key]) {
            const errors = fieldValidators[key](value);
            details.push(...errors);
        }

        const expectedMessages: Record<string, string[]> = {
            null: ['is null'],
            undefined: ['is missing'],
            '': ['is empty'],
        };

        Object.entries(expectedMessages).forEach(([checkValue, message]) => {

            if (value === checkValue) details.push(`${key} ${message}`);
        });

        if (typeof value === 'number' && isNaN(value)) {
            details.push(`${key} should be a valid number`);
        }
    });

    return details.length > 0 ? details : ['Valid test case'];
}

function generateVariantsForField(value: any, fieldDecorators: any[]): any[] {
    const variants: any[] = [];
    const fieldType = fieldDecorators.find((decorator) => decorator.decorator === 'Type')?.value;
    const minLength = fieldDecorators.find((decorator) => decorator.decorator === 'Min')?.value;
    const maxLength = fieldDecorators.find((decorator) => decorator.decorator === 'Max')?.value;

    const addVariants = (newVariants: any[]) => variants.push(...newVariants);

    switch (fieldType) {
        case 'string':
            addVariants([null, undefined, '', 'random_string']);
            if (minLength) addVariants([''.padStart(minLength, 'a')]);
            if (maxLength) addVariants([''.padStart(maxLength, 'a')]);
            break;
        case 'number':
            addVariants([null, undefined, '', 'random_string', 22, 0, -1]);
            break;
        case 'boolean':
            addVariants([null, undefined, value !== undefined ? !value : true]);
            break;
        case 'date':
            addVariants([null, undefined, new Date('invalid-date'), new Date()]);
            break;
        case 'any':
            addVariants([null, undefined, {}, [], 'random_object', 123]);
            break;
        case 'array':
            addVariants([null, undefined, [], ['item1', 'item2']]);
            break;
        default:
            addVariants([null, undefined]);
            break;
    }

    return variants;
}

function generateCombineTestcase(arrays: any[][]): any[][] {
    return arrays.reduce((a, b) => a.flatMap((d) => b.map((e) => [d, e].flat())));
}
