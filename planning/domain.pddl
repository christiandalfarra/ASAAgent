;; domain file: new_domain.pddl
(define (domain default)
    (:requirements :strips :typing)

    (:types tile parcel)

    (:predicates
        (down ?from ?to)
        (up ?from ?to)
        (left ?from ?to)
        (right ?from ?to)

        (at ?t - tile)
        (parcel_at ?p - parcel ?t - tile)
        (carrying ?p - parcel)

        (blocked ?t - tile)
        (occupied ?t - tile)
        (delivery ?t - tile)
    )

    (:action move-down
        :parameters (?from ?to - tile)
        :precondition (and (at ?from) (down ?to ?from)
                           (not (blocked ?to))
                           (not (occupied ?to)))
        :effect (and (at ?to) (not (at ?from)))
    )

    (:action move-up
        :parameters (?from ?to - tile)
        :precondition (and (at ?from) (up ?to ?from)
                           (not (blocked ?to))
                           (not (occupied ?to)))
        :effect (and (at ?to) (not (at ?from)))
    )

    (:action move-left
        :parameters (?from ?to - tile)
        :precondition (and (at ?from) (left ?to ?from)
                           (not (blocked ?to))
                           (not (occupied ?to)))
        :effect (and (at ?to) (not (at ?from)))
    )

    (:action move-right
        :parameters (?from ?to - tile)
        :precondition (and (at ?from) (right ?to ?from)
                           (not (blocked ?to))
                           (not (occupied ?to)))
        :effect (and (at ?to) (not (at ?from)))
    )

    (:action pick-up
        :parameters (?p - parcel ?t - tile)
        :precondition (and (at ?t) (parcel_at ?p ?t) (not (carrying ?p)))
        :effect (and (carrying ?p) (not (parcel_at ?p ?t)))
    )

    (:action put-down
        :parameters (?p - parcel ?t - tile)
        :precondition (and (at ?t) (carrying ?p))
        :effect (and (parcel_at ?p ?t) (not (carrying ?p)))
    )
)