
import { NextFunction, Request, Response } from 'express';
import authorizationMiddleware from '../../../src/middlewares/authorizationMiddleware';
import { USER_ROLE } from '../../../src/utils/enums';
import ErrorBuilder from '../../../src/utils/ErrorBuilder';

describe('Authorization middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction = jest.fn();

    beforeEach(() => {
        mockRequest = {
			t: (message: string) =>  ''
		};
        mockResponse = {
            json: jest.fn()
        };
    });

    it('Can access 1', async () => {
        mockRequest = {
			...mockRequest,
			user: {
				role: USER_ROLE.OPERATOR
			},
        }

        authorizationMiddleware([USER_ROLE.OPERATOR])(mockRequest as Request, mockResponse as Response, nextFunction);
        expect(nextFunction).toBeCalledTimes(1);
    });

	it('Can access 2', async () => {
        mockRequest = {
			...mockRequest,
			user: {
				role: USER_ROLE.OPERATOR
			},
        }

        authorizationMiddleware([USER_ROLE.OPERATOR, USER_ROLE.SWIMMING_POOL_EMPLOYEE])(mockRequest as Request, mockResponse as Response, nextFunction);
        expect(nextFunction).toBeCalledTimes(2);
    });

	it('Should throw 403', async () => {
        mockRequest = {
			...mockRequest,
			user: {
				role: USER_ROLE.OPERATOR
			},
        }
		expect(() => {
        	authorizationMiddleware([USER_ROLE.SWIMMING_POOL_OPERATOR])(mockRequest as Request, mockResponse as Response, nextFunction);
        }).toThrow(new ErrorBuilder(403, 'Forbidden'));
    });

	it('Should throw 403', async () => {
        mockRequest = {
			...mockRequest,
			user: {
				role: USER_ROLE.BASIC
			},
        }
		expect(() => {
        	authorizationMiddleware([USER_ROLE.SWIMMING_POOL_OPERATOR, USER_ROLE.OPERATOR])(mockRequest as Request, mockResponse as Response, nextFunction);
        }).toThrow(new ErrorBuilder(403, 'Forbidden'));
    });


	it('Should throw 401', async () => {
		expect(() => {
        	authorizationMiddleware([USER_ROLE.BASIC])(mockRequest as Request, mockResponse as Response, nextFunction);
        }).toThrow(new ErrorBuilder(401, ''));
    });

	it('Should throw error', async () => {
		expect(() => {
        	authorizationMiddleware([])(mockRequest as Request, mockResponse as Response, nextFunction);
        }).toThrow(Error);
    });
});
