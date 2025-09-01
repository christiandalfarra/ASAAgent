;; planning/domain.pddl
;; Deliveroo-style single-agent domain: directed adjacencies, delivery tiles,
;; explored tagging, and delivered parcels removed from play.

(define (domain deliveroo-bdi)
  (:requirements :strips :typing :negative-preconditions)

  (:types
    tile
    parcel
  )

  (:predicates
    ;; agent location
    (at ?t - tile)

    ;; parcels
    (parcel_at ?p - parcel ?t - tile)   ;; on-map parcel
    (carrying ?p - parcel)              ;; agent holds parcel
    (delivered ?p - parcel)             ;; parcel permanently completed

    ;; directed adjacencies
    (up ?from - tile ?to - tile)
    (down ?from - tile ?to - tile)
    (left ?from - tile ?to - tile)
    (right ?from - tile ?to - tile)

    ;; tile tags
    (spawn ?t - tile)
    (delivery ?t - tile)
    (explored ?t - tile)
  )

  ;; --------
  ;; Movement (no costs modeled)
  ;; --------

  (:action move-up
    :parameters (?from - tile ?to - tile)
    :precondition (and (at ?from) (up ?from ?to))
    :effect (and (at ?to) (not (at ?from)) (explored ?to))
  )

  (:action move-down
    :parameters (?from - tile ?to - tile)
    :precondition (and (at ?from) (down ?from ?to))
    :effect (and (at ?to) (not (at ?from)) (explored ?to))
  )

  (:action move-left
    :parameters (?from - tile ?to - tile)
    :precondition (and (at ?from) (left ?from ?to))
    :effect (and (at ?to) (not (at ?from)) (explored ?to))
  )

  (:action move-right
    :parameters (?from - tile ?to - tile)
    :precondition (and (at ?from) (right ?from ?to))
    :effect (and (at ?to) (not (at ?from)) (explored ?to))
  )

  ;; -------------
  ;; Parcel actions
  ;; -------------

  ;; Pick up a non-delivered parcel on current tile
  (:action pick-up
    :parameters (?p - parcel ?t - tile)
    :precondition (and
      (at ?t)
      (parcel_at ?p ?t)
      (not (carrying ?p))
      (not (delivered ?p))
    )
    :effect (and
      (carrying ?p)
      (not (parcel_at ?p ?t))
    )
  )

  ;; Put down a carried parcel on current tile (keeps it in play)
  (:action put-down
    :parameters (?p - parcel ?t - tile)
    :precondition (and (at ?t) (carrying ?p))
    :effect (and
      (parcel_at ?p ?t)
      (not (carrying ?p))
    )
  )

  ;; Deliver on a delivery tile: parcel is completed and no longer on map
  (:action deliver
    :parameters (?p - parcel ?t - tile)
    :precondition (and (at ?t) (carrying ?p) (delivery ?t) (not (delivered ?p)))
    :effect (and
      (delivered ?p)
      (not (carrying ?p))
      ;; parcel disappears from the world after delivery; no parcel_at added
    )
  )
)