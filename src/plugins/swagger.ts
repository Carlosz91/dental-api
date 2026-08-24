import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

const swaggerPlugin: FastifyPluginAsync = async (fastify) => {
  const port = process.env.PORT || '3000'
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Dental API',
        description: 'API para gestión de turnos odontológicos',
        version: '1.0.0',
      },
      servers: [
        { url: `http://localhost:${port}`, description: 'Development' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  })

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true },
  })
}

export default fp(swaggerPlugin)