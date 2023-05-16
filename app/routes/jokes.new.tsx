import { ActionFunction, LoaderArgs, redirect } from '@remix-run/node'
import {
  Form,
  Link,
  isRouteErrorResponse,
  useActionData,
  useNavigation,
  useRouteError,
} from '@remix-run/react'
import { JokeDisplay } from '~/components/joke'
import { db } from '~/utils/db.server'
import { badRequest } from '~/utils/request.server'

import { requireUserId, getUser } from '~/utils/session.server'

function validateTitle(value: string) {
  if (value.length < 3) return 'Title is too short'
}

function validateContent(value: string) {
  if (value.length < 10) return 'Content is too short'
}

export const loader = async ({ request }: LoaderArgs) => {
  const user = await getUser(request)

  if (!user) {
    throw new Response('Unauthorized', {
      status: 401,
    })
  }

  return null
}

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData()

  const userId = await requireUserId(request)

  const name = formData.get('name')
  const content = formData.get('content')

  if (typeof content !== 'string' || typeof name !== 'string') {
    return badRequest({
      fieldError: null,
      field: null,
      formError: 'Bad request',
    })
  }

  const fieldErrors = {
    name: validateTitle(name),
    content: validateContent(content),
  }

  const field = {
    name,
    content,
  }

  if (Object.values(fieldErrors).some((val) => Boolean(val))) {
    return badRequest({
      fieldErrors,
      field,
      formError: null,
    })
  }

  const joke = await db.joke.create({
    data: { ...field, jokesterId: userId },
  })

  return redirect(`/jokes/${joke.id}`)
}

export default function NewJokeRoute() {
  const navigation = useNavigation()
  const actionData = useActionData<typeof action>()

  if (navigation.formData) {
    const content = navigation.formData.get('content')
    const name = navigation.formData.get('name')

    if (
      typeof content == 'string' &&
      typeof name == 'string' &&
      !validateContent(content) &&
      !validateTitle(name)
    ) {
      return (
        <JokeDisplay
          joke={{ name, content }}
          isOwner={true}
          canDelete={false}
        />
      )
    }
  }

  return (
    <div>
      <p>Add your own hilarious joke</p>
      <Form method="post">
        <div>
          <label>
            Name:{' '}
            <input
              defaultValue={actionData?.field?.name}
              type="text"
              name="name"
            />
            {actionData?.fieldErrors?.name ? (
              <p className="form-validation-error" id="name-error" role="alert">
                {actionData.fieldErrors.name}
              </p>
            ) : null}
          </label>
        </div>
        <div>
          <label>
            Content:{' '}
            <textarea
              defaultValue={actionData?.field?.content}
              name="content"
            />
            {actionData?.fieldErrors?.content ? (
              <p
                className="form-validation-error"
                id="content-error"
                role="alert"
              >
                {actionData.fieldErrors.content}
              </p>
            ) : null}
          </label>
        </div>
        <div>
          {actionData?.formError ? (
            <p className="form-validation-error" role="alert">
              {actionData.formError}
            </p>
          ) : null}
          <button type="submit" className="button">
            Add
          </button>
        </div>
      </Form>
    </div>
  )
}

export function ErrorBoundary() {
  const error = useRouteError()

  if (isRouteErrorResponse(error) && error.status === 401) {
    return (
      <div className="error-container">
        <p>You must be logged in to create a joke.</p>
        <Link to="/login">Login</Link>
      </div>
    )
  }

  return (
    <div className="error-container">
      Something unexpected went wrong. Sorry about that.
    </div>
  )
}
