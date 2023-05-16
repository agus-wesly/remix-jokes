import {
  ActionArgs,
  LoaderArgs,
  json,
  redirect,
  V2_MetaFunction,
} from '@remix-run/node'

import {
  useLoaderData,
  useParams,
  useRouteError,
  isRouteErrorResponse,
  Form,
} from '@remix-run/react'

import { db } from '~/utils/db.server'
import { getUserId } from '~/utils/session.server'
import { JokeDisplay } from '~/components/joke'

export const meta: V2_MetaFunction<typeof loader> = ({ data }) => {
  const { description, title } = data
    ? {
        description: `Enjoy the "${data.joke.name}" joke and much more`,
        title: `"${data.joke.name}" joke`,
      }
    : { description: 'No joke found', title: 'No joke' }

  return [
    { name: 'description', content: description },
    { name: 'twitter:description', content: description },
    { title },
  ]
}

export const loader = async ({ params, request }: LoaderArgs) => {
  const userId = await getUserId(request)

  const joke = await db.joke.findUnique({
    where: {
      id: params.jokeId,
    },
  })

  if (!joke) {
    throw new Response('What a joke ! Not found', {
      status: 404,
    })
  }

  return json({
    joke,
    isOwner: userId === joke.jokesterId,
  })
}

export const action = async ({ request, params }: ActionArgs) => {
  const form = await request.formData()

  if (form.get('intent') !== 'delete') {
    throw new Response(`The intent ${form.get('intent')} is not supported`, {
      status: 400,
    })
  }

  const joke = await db.joke.findFirst({
    where: {
      id: params.jokeId,
    },
  })

  if (!joke) throw new Response('Joke not found', { status: 404 })

  const userId = await getUserId(request)

  if (joke.jokesterId !== userId) {
    throw new Response('Nice try bozo ! You cant delete other`s post', {
      status: 403,
    })
  }

  await db.joke.delete({
    where: {
      id: joke.id,
    },
  })

  return redirect('/jokes')
}

export default function JokeRoute() {
  const data = useLoaderData<typeof loader>()

  if (!data) throw new Error('Not found')

  return <JokeDisplay joke={data.joke} isOwner={data.isOwner} />
}

export function ErrorBoundary() {
  const { jokeId } = useParams()
  const error = useRouteError()

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <div className="error-container">Huh? What the heck is "{jokeId}"?</div>
    )
  }

  if (isRouteErrorResponse(error) && error.status === 400) {
    return <div className="error-container">{error.data}</div>
  }

  if (isRouteErrorResponse(error) && error.status === 403) {
    return <div className="error-container">Its not your joke</div>
  }
  return (
    <div className="error-container">
      There was an error loading joke by the id "${jokeId}". Sorry.
    </div>
  )
}
